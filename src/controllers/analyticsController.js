const pool = require('../config/db');

async function getCreatorAnalyticsOverview(req, res) {
  try {
    const userId = req.user.id;

    const [creatorProfiles] = await pool.query(
      'SELECT id, public_name FROM creator_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!creatorProfiles.length) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const creatorId = creatorProfiles[0].id;

    const [channelRows] = await pool.query(
      'SELECT id, channel_name, channel_slug, subscriber_count, total_views, total_videos FROM channels WHERE creator_id = ? ORDER BY id DESC',
      [creatorId]
    );

    const [videoRows] = await pool.query(
      `SELECT id, channel_id, title, slug, status, moderation_status, duration_seconds, published_at, created_at
       FROM videos
       WHERE creator_id = ?
       ORDER BY id DESC`,
      [creatorId]
    );

    const channelIds = channelRows.map((row) => row.id);
    const videoIds = videoRows.map((row) => row.id);

    let channelAnalytics = {
      total_views: 0,
      total_watch_time_seconds: 0,
      total_subscribers_gained: 0,
      total_subscribers_lost: 0,
      total_revenue_amount: 0,
    };

    let videoAnalytics = {
      total_views: 0,
      total_unique_viewers: 0,
      total_watch_time_seconds: 0,
      avg_watch_seconds: 0,
      total_likes: 0,
      total_dislikes: 0,
      total_comments: 0,
      total_shares: 0,
      total_cta_clicks: 0,
      total_subscribers_gained: 0,
      total_revenue_amount: 0,
    };

    if (channelIds.length > 0) {
      const [channelAnalyticsRows] = await pool.query(
        `SELECT
          COALESCE(SUM(views), 0) AS total_views,
          COALESCE(SUM(watch_time_seconds), 0) AS total_watch_time_seconds,
          COALESCE(SUM(subscribers_gained), 0) AS total_subscribers_gained,
          COALESCE(SUM(subscribers_lost), 0) AS total_subscribers_lost,
          COALESCE(SUM(revenue_amount), 0) AS total_revenue_amount
         FROM channel_analytics_daily
         WHERE channel_id IN (?)`,
        [channelIds]
      );

      channelAnalytics = {
        total_views: Number(channelAnalyticsRows[0].total_views || 0),
        total_watch_time_seconds: Number(channelAnalyticsRows[0].total_watch_time_seconds || 0),
        total_subscribers_gained: Number(channelAnalyticsRows[0].total_subscribers_gained || 0),
        total_subscribers_lost: Number(channelAnalyticsRows[0].total_subscribers_lost || 0),
        total_revenue_amount: Number(channelAnalyticsRows[0].total_revenue_amount || 0),
      };
    }

    if (videoIds.length > 0) {
      const [videoAnalyticsRows] = await pool.query(
        `SELECT
          COALESCE(SUM(views), 0) AS total_views,
          COALESCE(SUM(unique_viewers), 0) AS total_unique_viewers,
          COALESCE(SUM(watch_time_seconds), 0) AS total_watch_time_seconds,
          COALESCE(AVG(avg_watch_seconds), 0) AS avg_watch_seconds,
          COALESCE(SUM(likes), 0) AS total_likes,
          COALESCE(SUM(dislikes), 0) AS total_dislikes,
          COALESCE(SUM(comments), 0) AS total_comments,
          COALESCE(SUM(shares), 0) AS total_shares,
          COALESCE(SUM(cta_clicks), 0) AS total_cta_clicks,
          COALESCE(SUM(subscribers_gained), 0) AS total_subscribers_gained,
          COALESCE(SUM(revenue_amount), 0) AS total_revenue_amount
         FROM video_analytics_daily
         WHERE video_id IN (?)`,
        [videoIds]
      );

      videoAnalytics = {
        total_views: Number(videoAnalyticsRows[0].total_views || 0),
        total_unique_viewers: Number(videoAnalyticsRows[0].total_unique_viewers || 0),
        total_watch_time_seconds: Number(videoAnalyticsRows[0].total_watch_time_seconds || 0),
        avg_watch_seconds: Number(videoAnalyticsRows[0].avg_watch_seconds || 0),
        total_likes: Number(videoAnalyticsRows[0].total_likes || 0),
        total_dislikes: Number(videoAnalyticsRows[0].total_dislikes || 0),
        total_comments: Number(videoAnalyticsRows[0].total_comments || 0),
        total_shares: Number(videoAnalyticsRows[0].total_shares || 0),
        total_cta_clicks: Number(videoAnalyticsRows[0].total_cta_clicks || 0),
        total_subscribers_gained: Number(videoAnalyticsRows[0].total_subscribers_gained || 0),
        total_revenue_amount: Number(videoAnalyticsRows[0].total_revenue_amount || 0),
      };
    }

    return res.status(200).json({
      creator: creatorProfiles[0],
      totals: {
        total_channels: channelRows.length,
        total_videos: videoRows.length,
        published_videos: videoRows.filter((video) => video.status === 'published').length,
        channel_analytics: channelAnalytics,
        video_analytics: videoAnalytics,
      },
      channels: channelRows,
      videos: videoRows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch creator analytics overview',
      error: error.message,
    });
  }
}

async function getChannelAnalytics(req, res) {
  try {
    const userId = req.user.id;
    const { channelId } = req.params;

    const [creatorProfiles] = await pool.query(
      'SELECT id FROM creator_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!creatorProfiles.length) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const creatorId = creatorProfiles[0].id;

    const [channels] = await pool.query(
      'SELECT * FROM channels WHERE id = ? AND creator_id = ? LIMIT 1',
      [channelId, creatorId]
    );

    if (!channels.length) {
      return res.status(404).json({
        message: 'Channel not found',
      });
    }

    const [dailyRows] = await pool.query(
      `SELECT *
       FROM channel_analytics_daily
       WHERE channel_id = ?
       ORDER BY analytics_date DESC`,
      [channelId]
    );

    const [totalsRows] = await pool.query(
      `SELECT
        COALESCE(SUM(views), 0) AS total_views,
        COALESCE(SUM(watch_time_seconds), 0) AS total_watch_time_seconds,
        COALESCE(SUM(subscribers_gained), 0) AS total_subscribers_gained,
        COALESCE(SUM(subscribers_lost), 0) AS total_subscribers_lost,
        COALESCE(SUM(video_count), 0) AS total_video_count_metric,
        COALESCE(SUM(revenue_amount), 0) AS total_revenue_amount
       FROM channel_analytics_daily
       WHERE channel_id = ?`,
      [channelId]
    );

    return res.status(200).json({
      channel: channels[0],
      totals: {
        total_views: Number(totalsRows[0].total_views || 0),
        total_watch_time_seconds: Number(totalsRows[0].total_watch_time_seconds || 0),
        total_subscribers_gained: Number(totalsRows[0].total_subscribers_gained || 0),
        total_subscribers_lost: Number(totalsRows[0].total_subscribers_lost || 0),
        total_video_count_metric: Number(totalsRows[0].total_video_count_metric || 0),
        total_revenue_amount: Number(totalsRows[0].total_revenue_amount || 0),
      },
      daily_analytics: dailyRows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch channel analytics',
      error: error.message,
    });
  }
}

async function getVideoAnalytics(req, res) {
  try {
    const userId = req.user.id;
    const { videoId } = req.params;

    const [creatorProfiles] = await pool.query(
      'SELECT id FROM creator_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!creatorProfiles.length) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const creatorId = creatorProfiles[0].id;

    const [videos] = await pool.query(
      'SELECT * FROM videos WHERE id = ? AND creator_id = ? LIMIT 1',
      [videoId, creatorId]
    );

    if (!videos.length) {
      return res.status(404).json({
        message: 'Video not found',
      });
    }

    const [dailyRows] = await pool.query(
      `SELECT *
       FROM video_analytics_daily
       WHERE video_id = ?
       ORDER BY analytics_date DESC`,
      [videoId]
    );

    const [totalsRows] = await pool.query(
      `SELECT
        COALESCE(SUM(views), 0) AS total_views,
        COALESCE(SUM(unique_viewers), 0) AS total_unique_viewers,
        COALESCE(SUM(watch_time_seconds), 0) AS total_watch_time_seconds,
        COALESCE(AVG(avg_watch_seconds), 0) AS avg_watch_seconds,
        COALESCE(SUM(likes), 0) AS total_likes,
        COALESCE(SUM(dislikes), 0) AS total_dislikes,
        COALESCE(SUM(comments), 0) AS total_comments,
        COALESCE(SUM(shares), 0) AS total_shares,
        COALESCE(SUM(cta_clicks), 0) AS total_cta_clicks,
        COALESCE(SUM(subscribers_gained), 0) AS total_subscribers_gained,
        COALESCE(SUM(revenue_amount), 0) AS total_revenue_amount
       FROM video_analytics_daily
       WHERE video_id = ?`,
      [videoId]
    );

    return res.status(200).json({
      video: videos[0],
      totals: {
        total_views: Number(totalsRows[0].total_views || 0),
        total_unique_viewers: Number(totalsRows[0].total_unique_viewers || 0),
        total_watch_time_seconds: Number(totalsRows[0].total_watch_time_seconds || 0),
        avg_watch_seconds: Number(totalsRows[0].avg_watch_seconds || 0),
        total_likes: Number(totalsRows[0].total_likes || 0),
        total_dislikes: Number(totalsRows[0].total_dislikes || 0),
        total_comments: Number(totalsRows[0].total_comments || 0),
        total_shares: Number(totalsRows[0].total_shares || 0),
        total_cta_clicks: Number(totalsRows[0].total_cta_clicks || 0),
        total_subscribers_gained: Number(totalsRows[0].total_subscribers_gained || 0),
        total_revenue_amount: Number(totalsRows[0].total_revenue_amount || 0),
      },
      daily_analytics: dailyRows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch video analytics',
      error: error.message,
    });
  }
}

module.exports = {
  getCreatorAnalyticsOverview,
  getChannelAnalytics,
  getVideoAnalytics,
};