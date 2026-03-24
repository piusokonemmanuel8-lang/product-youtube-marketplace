const pool = require('../config/db');

async function getPublicWatchPage(req, res) {
  try {
    const { slug } = req.params;

    const [videos] = await pool.query(
      `SELECT
        v.*,
        c.id AS channel_db_id,
        c.channel_name,
        c.channel_handle,
        c.channel_slug,
        c.avatar_url,
        c.banner_url,
        c.bio,
        c.subscriber_count,
        c.total_views,
        c.total_videos,
        c.status AS channel_status,
        cp.public_name AS creator_public_name
       FROM videos v
       INNER JOIN channels c ON c.id = v.channel_id
       LEFT JOIN creator_profiles cp ON cp.id = v.creator_id
       WHERE v.slug = ?
         AND v.status = 'published'
         AND v.moderation_status = 'approved'
       LIMIT 1`,
      [slug]
    );

    if (!videos.length) {
      return res.status(404).json({
        message: 'Video not found',
      });
    }

    const video = videos[0];

    const [videoTags] = await pool.query(
      `SELECT t.*
       FROM video_tags vt
       INNER JOIN tags t ON t.id = vt.tag_id
       WHERE vt.video_id = ?
       ORDER BY t.id DESC`,
      [video.id]
    );

    const [channelLinks] = await pool.query(
      `SELECT *
       FROM channel_links
       WHERE channel_id = ?
       ORDER BY id DESC`,
      [video.channel_id]
    );

    const [productLinks] = await pool.query(
      `SELECT *
       FROM product_links
       WHERE video_id = ?
       ORDER BY id DESC`,
      [video.id]
    );

    const [commentCountRows] = await pool.query(
      `SELECT COUNT(*) AS total_comments
       FROM comments
       WHERE video_id = ? AND status = 'active'`,
      [video.id]
    );

    const [reactionRows] = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN reaction_type = 'like' THEN 1 ELSE 0 END), 0) AS likes_count,
        COALESCE(SUM(CASE WHEN reaction_type = 'dislike' THEN 1 ELSE 0 END), 0) AS dislikes_count
       FROM video_reactions
       WHERE video_id = ?`,
      [video.id]
    );

    const [shareRows] = await pool.query(
      `SELECT COUNT(*) AS total_shares
       FROM video_shares
       WHERE video_id = ?`,
      [video.id]
    );

    const [viewRows] = await pool.query(
      `SELECT COUNT(*) AS total_views
       FROM video_views
       WHERE video_id = ?`,
      [video.id]
    );

    return res.status(200).json({
      video: {
        id: video.id,
        uuid: video.uuid,
        creator_id: video.creator_id,
        channel_id: video.channel_id,
        category_id: video.category_id,
        title: video.title,
        slug: video.slug,
        description: video.description,
        video_type: video.video_type,
        source_type: video.source_type,
        storage_provider: video.storage_provider,
        video_key: video.video_key,
        stream_key: video.stream_key,
        thumbnail_key: video.thumbnail_key,
        preview_key: video.preview_key,
        duration_seconds: video.duration_seconds,
        visibility: video.visibility,
        comments_enabled: video.comments_enabled,
        buy_now_enabled: video.buy_now_enabled,
        buy_now_url: video.buy_now_url,
        is_monetized: video.is_monetized,
        published_at: video.published_at,
        created_at: video.created_at,
      },
      channel: {
        id: video.channel_db_id,
        channel_name: video.channel_name,
        channel_handle: video.channel_handle,
        channel_slug: video.channel_slug,
        avatar_url: video.avatar_url,
        banner_url: video.banner_url,
        bio: video.bio,
        subscriber_count: video.subscriber_count,
        total_views: video.total_views,
        total_videos: video.total_videos,
        status: video.channel_status,
        creator_public_name: video.creator_public_name,
      },
      metrics: {
        total_views: Number(viewRows[0].total_views || 0),
        likes_count: Number(reactionRows[0].likes_count || 0),
        dislikes_count: Number(reactionRows[0].dislikes_count || 0),
        total_comments: Number(commentCountRows[0].total_comments || 0),
        total_shares: Number(shareRows[0].total_shares || 0),
      },
      tags: videoTags,
      channel_links: channelLinks,
      product_links: productLinks,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch public watch page',
      error: error.message,
    });
  }
}

async function recordPublicVideoView(req, res) {
  try {
    const userId = req.user ? req.user.id : null;
    const { videoId } = req.params;
    const {
      session_id,
      ip_hash,
      device_type,
      browser,
      country_code,
      watch_seconds,
      completed_percent,
      source_page,
      referrer_url,
    } = req.body;

    const [videos] = await pool.query(
      'SELECT id FROM videos WHERE id = ? LIMIT 1',
      [videoId]
    );

    if (!videos.length) {
      return res.status(404).json({
        message: 'Video not found',
      });
    }

    const [result] = await pool.query(
      `INSERT INTO video_views
      (
        video_id,
        user_id,
        session_id,
        ip_hash,
        device_type,
        browser,
        country_code,
        watch_seconds,
        completed_percent,
        source_page,
        referrer_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        videoId,
        userId,
        session_id || null,
        ip_hash || null,
        device_type || null,
        browser || null,
        country_code || null,
        watch_seconds || 0,
        completed_percent || 0,
        source_page || null,
        referrer_url || null,
      ]
    );

    const [rows] = await pool.query(
      'SELECT * FROM video_views WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Video view recorded successfully',
      view: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to record video view',
      error: error.message,
    });
  }
}

async function getRelatedVideos(req, res) {
  try {
    const { videoId } = req.params;

    const [videos] = await pool.query(
      'SELECT id, channel_id, category_id FROM videos WHERE id = ? LIMIT 1',
      [videoId]
    );

    if (!videos.length) {
      return res.status(404).json({
        message: 'Video not found',
      });
    }

    const currentVideo = videos[0];

    const [relatedRows] = await pool.query(
      `SELECT
        v.id,
        v.uuid,
        v.channel_id,
        v.title,
        v.slug,
        v.thumbnail_key,
        v.duration_seconds,
        v.published_at,
        c.channel_name,
        c.channel_handle
       FROM videos v
       INNER JOIN channels c ON c.id = v.channel_id
       WHERE v.id != ?
         AND v.status = 'published'
         AND v.moderation_status = 'approved'
         AND (
           v.channel_id = ?
           OR (v.category_id IS NOT NULL AND v.category_id = ?)
         )
       ORDER BY v.id DESC
       LIMIT 12`,
      [videoId, currentVideo.channel_id, currentVideo.category_id]
    );

    return res.status(200).json({
      related_videos: relatedRows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch related videos',
      error: error.message,
    });
  }
}

module.exports = {
  getPublicWatchPage,
  recordPublicVideoView,
  getRelatedVideos,
};