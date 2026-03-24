const pool = require('../config/db');

async function getAdForVideo(req, res) {
  try {
    const { video_id, break_type, session_id } = req.query;

    let viewerVideo = null;

    if (video_id) {
      const [videos] = await pool.query(
        'SELECT * FROM videos WHERE id = ? LIMIT 1',
        [video_id]
      );

      if (videos.length) {
        viewerVideo = videos[0];
      }
    }

    let durationFilter = '';

    if (viewerVideo) {
      if (viewerVideo.duration_seconds < 60) {
        durationFilter = ' AND av.duration_seconds <= 15 ';
      } else if (viewerVideo.duration_seconds < 300) {
        durationFilter = ' AND av.duration_seconds <= 30 ';
      } else {
        durationFilter = ' AND av.duration_seconds <= 60 ';
      }
    }

    let allowedBreaks = ['pre-roll'];

    if (viewerVideo) {
      if (viewerVideo.duration_seconds < 60) {
        allowedBreaks = ['pre-roll'];
      } else if (viewerVideo.duration_seconds < 300) {
        allowedBreaks = ['pre-roll'];
      } else if (viewerVideo.duration_seconds < 900) {
        allowedBreaks = ['pre-roll', 'mid-roll'];
      } else {
        allowedBreaks = ['pre-roll', 'mid-roll', 'post-roll'];
      }
    }

    const finalBreakType = break_type || allowedBreaks[0];

    if (!allowedBreaks.includes(finalBreakType)) {
      return res.status(400).json({
        message: 'This ad break type is not allowed for this video length',
        allowed_breaks: allowedBreaks,
      });
    }

    if (session_id) {
      const [recentImpressions] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM ad_impressions
         WHERE session_id = ?
           AND created_at >= (NOW() - INTERVAL 10 MINUTE)`,
        [session_id]
      );

      if (recentImpressions[0].total >= 3) {
        return res.status(429).json({
          message: 'Ad frequency cap reached for this viewer session',
        });
      }
    }

    const [ads] = await pool.query(
      `SELECT
        ac.id AS campaign_id,
        ac.title AS campaign_title,
        ac.destination_url,
        ac.skip_after_seconds,
        av.id AS ad_video_id,
        av.title AS ad_title,
        av.video_key,
        av.thumbnail_key,
        av.duration_seconds
      FROM ad_campaigns ac
      INNER JOIN ad_videos av ON av.campaign_id = ac.id
      WHERE ac.status = 'active'
        AND av.status = 'approved'
        AND (ac.starts_at IS NULL OR ac.starts_at <= NOW())
        AND (ac.ends_at IS NULL OR ac.ends_at >= NOW())
        ${durationFilter}
      ORDER BY RAND()
      LIMIT 1`
    );

    if (!ads.length) {
      return res.status(404).json({
        message: 'No ad available',
      });
    }

    return res.status(200).json({
      ad: ads[0],
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