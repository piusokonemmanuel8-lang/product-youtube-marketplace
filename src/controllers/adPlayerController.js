const pool = require('../config/db');

const S3_BUCKET_NAME =
  process.env.AWS_S3_BUCKET ||
  process.env.AWS_S3_BUCKET_NAME ||
  process.env.AWS_BUCKET_NAME ||
  process.env.AWS_BUCKET ||
  '';

const S3_REGION =
  process.env.AWS_REGION ||
  process.env.AWS_S3_REGION ||
  'us-east-1';

const CLOUDFRONT_URL =
  process.env.AWS_CLOUDFRONT_URL ||
  process.env.CLOUDFRONT_URL ||
  '';

function buildMediaUrl(req, fileKey) {
  if (!fileKey) return null;

  if (/^https?:\/\//i.test(fileKey)) {
    return fileKey;
  }

  const cleanKey = String(fileKey).trim().replace(/\\/g, '/').replace(/^\/+/, '');

  if (CLOUDFRONT_URL) {
    return `${CLOUDFRONT_URL.replace(/\/$/, '')}/${cleanKey}`;
  }

  if (S3_BUCKET_NAME) {
    return `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${cleanKey}`;
  }

  return `${req.protocol}://${req.get('host')}/uploads/${cleanKey}`;
}

function getDurationCap(viewerVideo) {
  const seconds = Number(viewerVideo?.duration_seconds || 0);

  if (seconds > 0 && seconds < 60) return 15;
  if (seconds >= 60 && seconds < 300) return 30;
  return 60;
}

function getAllowedBreaks(viewerVideo) {
  const seconds = Number(viewerVideo?.duration_seconds || 0);

  if (seconds > 0 && seconds < 900) {
    return ['pre-roll'];
  }

  return ['pre-roll', 'mid-roll', 'post-roll'];
}

async function getViewerVideo(videoId) {
  if (!videoId) return null;

  const [videos] = await pool.query(
    'SELECT * FROM videos WHERE id = ? LIMIT 1',
    [videoId]
  );

  return videos.length ? videos[0] : null;
}

async function getRecentSessionCampaignIds(sessionId) {
  if (!sessionId) return [];

  const [rows] = await pool.query(
    `SELECT DISTINCT campaign_id
     FROM ad_impressions
     WHERE session_id = ?
       AND campaign_id IS NOT NULL
       AND created_at >= (NOW() - INTERVAL 10 MINUTE)`,
    [sessionId]
  );

  return rows.map((row) => Number(row.campaign_id)).filter(Boolean);
}

async function getRecentSessionImpressionCount(sessionId) {
  if (!sessionId) return 0;

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM ad_impressions
     WHERE session_id = ?
       AND created_at >= (NOW() - INTERVAL 10 MINUTE)`,
    [sessionId]
  );

  return Number(rows[0]?.total || 0);
}

async function pickBestAd({
  durationCap,
  excludedCampaignIds,
}) {
  const excludeSql = excludedCampaignIds.length
    ? `AND ac.id NOT IN (${excludedCampaignIds.map(() => '?').join(',')})`
    : '';

  const excludeParams = excludedCampaignIds.length ? excludedCampaignIds : [];

  const baseSelect = `
    SELECT
      ac.id AS campaign_id,
      ac.title AS campaign_title,
      ac.destination_url,
      ac.skip_after_seconds,
      ac.starts_at,
      ac.ends_at,
      av.id AS ad_video_id,
      av.title AS ad_title,
      av.video_key,
      av.thumbnail_key,
      av.duration_seconds,
      COALESCE(session_stats.session_impressions, 0) AS session_impressions,
      COALESCE(global_stats.total_impressions, 0) AS total_impressions,
      global_stats.last_impression_at
    FROM ad_campaigns ac
    INNER JOIN ad_videos av ON av.campaign_id = ac.id
    LEFT JOIN (
      SELECT
        campaign_id,
        COUNT(*) AS total_impressions,
        MAX(created_at) AS last_impression_at
      FROM ad_impressions
      GROUP BY campaign_id
    ) global_stats ON global_stats.campaign_id = ac.id
    LEFT JOIN (
      SELECT
        campaign_id,
        COUNT(*) AS session_impressions
      FROM ad_impressions
      WHERE created_at >= (NOW() - INTERVAL 10 MINUTE)
      GROUP BY campaign_id
    ) session_stats ON session_stats.campaign_id = ac.id
    WHERE ac.status = 'active'
      AND av.status = 'approved'
      AND av.video_key IS NOT NULL
      AND av.video_key != ''
      AND (ac.starts_at IS NULL OR ac.starts_at <= NOW())
      AND (ac.ends_at IS NULL OR ac.ends_at >= NOW())
  `;

  let [ads] = await pool.query(
    `
      ${baseSelect}
      AND COALESCE(NULLIF(av.duration_seconds, 0), 15) <= ?
      ${excludeSql}
      ORDER BY
        session_impressions ASC,
        total_impressions ASC,
        last_impression_at ASC,
        ac.id ASC,
        av.id ASC
      LIMIT 1
    `,
    [durationCap, ...excludeParams]
  );

  if (ads.length) return ads[0];

  [ads] = await pool.query(
    `
      ${baseSelect}
      AND COALESCE(NULLIF(av.duration_seconds, 0), 15) <= ?
      ORDER BY
        session_impressions ASC,
        total_impressions ASC,
        last_impression_at ASC,
        ac.id ASC,
        av.id ASC
      LIMIT 1
    `,
    [durationCap]
  );

  if (ads.length) return ads[0];

  [ads] = await pool.query(
    `
      ${baseSelect}
      ${excludeSql}
      ORDER BY
        session_impressions ASC,
        total_impressions ASC,
        last_impression_at ASC,
        ac.id ASC,
        av.id ASC
      LIMIT 1
    `,
    [...excludeParams]
  );

  if (ads.length) return ads[0];

  [ads] = await pool.query(
    `
      ${baseSelect}
      ORDER BY
        session_impressions ASC,
        total_impressions ASC,
        last_impression_at ASC,
        ac.id ASC,
        av.id ASC
      LIMIT 1
    `
  );

  return ads.length ? ads[0] : null;
}

async function getAdForVideo(req, res) {
  try {
    const { video_id, break_type, session_id } = req.query;

    const viewerVideo = await getViewerVideo(video_id);
    const allowedBreaks = getAllowedBreaks(viewerVideo);
    const finalBreakType = break_type || 'pre-roll';

    if (!allowedBreaks.includes(finalBreakType)) {
      return res.status(400).json({
        message: 'This ad break type is not allowed for this video length',
        allowed_breaks: allowedBreaks,
      });
    }

    if (session_id) {
      const recentCount = await getRecentSessionImpressionCount(session_id);

      if (recentCount >= 3) {
        return res.status(429).json({
          message: 'Ad frequency cap reached for this viewer session',
        });
      }
    }

    const durationCap = getDurationCap(viewerVideo);
    const recentCampaignIds = await getRecentSessionCampaignIds(session_id);

    const ad = await pickBestAd({
      durationCap,
      excludedCampaignIds: recentCampaignIds,
    });

    if (!ad) {
      return res.status(404).json({
        message: 'No ad available',
      });
    }

    return res.status(200).json({
      ad: {
        ...ad,
        duration_seconds: Number(ad.duration_seconds || 15) || 15,
        video_key: buildMediaUrl(req, ad.video_key),
        thumbnail_key: buildMediaUrl(req, ad.thumbnail_key),
      },
      viewer_video_id: video_id || null,
      ad_break_type: finalBreakType,
      allowed_breaks: allowedBreaks,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch ad',
      error: error.message,
    });
  }
}

module.exports = {
  getAdForVideo,
};