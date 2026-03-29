const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function getCreatorProfileByUserId(userId) {
  const [creatorProfiles] = await pool.query(
    'SELECT id FROM creator_profiles WHERE user_id = ? LIMIT 1',
    [userId]
  );

  return creatorProfiles.length ? creatorProfiles[0] : null;
}

async function creatorCampaignColumnExists() {
  const [columns] = await pool.query(`SHOW COLUMNS FROM ad_campaigns`);
  return columns.some((column) => column.Field === 'creator_user_id');
}

function isHttpUrl(value = '') {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function looksLikeWatchPageUrl(value = '') {
  return /localhost:\d+\/watch\//i.test(String(value || '').trim()) ||
    /\/watch\//i.test(String(value || '').trim());
}

function cleanStoredKey(value = '') {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
}

function getUploadsRoot() {
  return path.join(process.cwd(), 'uploads');
}

function resolveUploadsPath(relativeKey = '') {
  const cleanKey = cleanStoredKey(relativeKey);
  return path.join(getUploadsRoot(), cleanKey);
}

function fileExists(relativeKey = '') {
  const absolutePath = resolveUploadsPath(relativeKey);
  return fs.existsSync(absolutePath);
}

function normalizeDurationSeconds(value, fallback = 15) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function isLikelyCloudObjectKey(value = '') {
  const cleanValue = cleanStoredKey(value);

  if (!cleanValue) {
    return false;
  }

  if (isHttpUrl(cleanValue)) {
    return false;
  }

  if (looksLikeWatchPageUrl(cleanValue)) {
    return false;
  }

  if (/^[a-zA-Z]:\//.test(cleanValue)) {
    return false;
  }

  if (cleanValue.startsWith('http://') || cleanValue.startsWith('https://')) {
    return false;
  }

  return (
    cleanValue.includes('/') &&
    !cleanValue.startsWith('uploads/') &&
    !cleanValue.startsWith('../') &&
    !cleanValue.startsWith('./')
  );
}

function normalizeMediaKey(rawValue = '', { checkLocalFile = false } = {}) {
  const raw = String(rawValue || '').trim();

  if (!raw) {
    return null;
  }

  if (looksLikeWatchPageUrl(raw)) {
    return {
      ok: false,
      message: 'Selected video is using a watch-page URL instead of a real video file',
    };
  }

  if (isHttpUrl(raw)) {
    return {
      ok: true,
      value: raw,
    };
  }

  const cleanValue = cleanStoredKey(raw);

  if (isLikelyCloudObjectKey(cleanValue)) {
    return {
      ok: true,
      value: cleanValue,
    };
  }

  if (checkLocalFile && !fileExists(cleanValue)) {
    return {
      ok: false,
      message: `Selected video file is missing from server uploads: ${cleanValue}`,
    };
  }

  return {
    ok: true,
    value: cleanValue,
  };
}

function validateSelectedVideoSource(selectedVideo) {
  const rawVideoKey = String(selectedVideo?.video_key || '').trim();
  const rawThumbnailKey = String(selectedVideo?.thumbnail_key || '').trim();

  if (!rawVideoKey) {
    return {
      ok: false,
      message: 'Selected video does not have a playable video source',
    };
  }

  const videoResult = normalizeMediaKey(rawVideoKey, { checkLocalFile: false });

  if (!videoResult.ok) {
    return videoResult;
  }

  let finalThumbnailKey = null;

  if (rawThumbnailKey) {
    const thumbResult = normalizeMediaKey(rawThumbnailKey, { checkLocalFile: false });

    if (thumbResult?.ok) {
      finalThumbnailKey = thumbResult.value;
    }
  }

  return {
    ok: true,
    video_key: videoResult.value,
    thumbnail_key: finalThumbnailKey,
  };
}

async function createAdVideo(req, res) {
  try {
    const {
      campaign_id,
      video_id,
      title,
      duration_seconds,
    } = req.body;

    if (!campaign_id || !video_id || !title) {
      return res.status(400).json({
        message: 'campaign_id, video_id and title are required',
      });
    }

    const creatorProfile = await getCreatorProfileByUserId(req.user.id);

    if (!creatorProfile) {
      return res.status(403).json({
        message: 'Only creators can create ad videos',
      });
    }

    const hasCreatorUserId = await creatorCampaignColumnExists();

    const [campaigns] = await pool.query(
      'SELECT * FROM ad_campaigns WHERE id = ? LIMIT 1',
      [campaign_id]
    );

    if (!campaigns.length) {
      return res.status(404).json({
        message: 'Ad campaign not found',
      });
    }

    if (hasCreatorUserId && Number(campaigns[0].creator_user_id || 0) !== Number(req.user.id)) {
      return res.status(403).json({
        message: 'You can only add ad videos to your own campaign',
      });
    }

    const [videos] = await pool.query(
      `SELECT *
       FROM videos
       WHERE id = ?
         AND creator_id = ?
       LIMIT 1`,
      [video_id, creatorProfile.id]
    );

    if (!videos.length) {
      return res.status(404).json({
        message: 'Selected channel video not found',
      });
    }

    const selectedVideo = videos[0];
    const sourceCheck = validateSelectedVideoSource(selectedVideo);

    if (!sourceCheck.ok) {
      return res.status(400).json({
        message: sourceCheck.message,
      });
    }

    const fallbackDuration = normalizeDurationSeconds(selectedVideo?.duration_seconds, 15);
    const finalDurationSeconds = normalizeDurationSeconds(duration_seconds, fallbackDuration);

    const [result] = await pool.query(
      `INSERT INTO ad_videos
      (
        campaign_id,
        title,
        video_key,
        thumbnail_key,
        duration_seconds,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Number(campaign_id),
        String(title).trim(),
        sourceCheck.video_key,
        sourceCheck.thumbnail_key,
        finalDurationSeconds,
        'pending',
      ]
    );

    const [adVideos] = await pool.query(
      `SELECT
        av.*,
        ac.title AS campaign_title,
        ac.advertiser_name,
        ac.status AS campaign_status
       FROM ad_videos av
       LEFT JOIN ad_campaigns ac ON ac.id = av.campaign_id
       WHERE av.id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Ad video created successfully',
      ad_video: adVideos[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create ad video',
      error: error.message,
    });
  }
}

async function getAllAdVideos(req, res) {
  try {
    const [adVideos] = await pool.query(
      `SELECT
        av.*,
        ac.title AS campaign_title,
        ac.advertiser_name,
        ac.status AS campaign_status
       FROM ad_videos av
       LEFT JOIN ad_campaigns ac ON ac.id = av.campaign_id
       ORDER BY av.id DESC`
    );

    return res.status(200).json({
      ad_videos: adVideos,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch ad videos',
      error: error.message,
    });
  }
}

async function getPendingAdVideos(req, res) {
  try {
    const [adVideos] = await pool.query(
      `SELECT
        av.*,
        ac.title AS campaign_title,
        ac.advertiser_name,
        ac.status AS campaign_status
       FROM ad_videos av
       LEFT JOIN ad_campaigns ac ON ac.id = av.campaign_id
       WHERE av.status IN ('pending', 'draft')
       ORDER BY av.id DESC`
    );

    return res.status(200).json({
      ad_videos: adVideos,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch pending ad videos',
      error: error.message,
    });
  }
}

async function getMyAdVideos(req, res) {
  try {
    const hasCreatorUserId = await creatorCampaignColumnExists();

    if (!hasCreatorUserId) {
      return res.status(200).json({
        ad_videos: [],
      });
    }

    const [adVideos] = await pool.query(
      `SELECT
        av.*,
        ac.title AS campaign_title,
        ac.advertiser_name,
        ac.status AS campaign_status,
        ac.creator_user_id
       FROM ad_videos av
       INNER JOIN ad_campaigns ac ON ac.id = av.campaign_id
       WHERE ac.creator_user_id = ?
       ORDER BY av.id DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      ad_videos: adVideos,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch my ad videos',
      error: error.message,
    });
  }
}

module.exports = {
  createAdVideo,
  getAllAdVideos,
  getPendingAdVideos,
  getMyAdVideos,
};