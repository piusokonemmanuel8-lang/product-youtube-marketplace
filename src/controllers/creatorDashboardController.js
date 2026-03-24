const pool = require('../config/db');

async function getCreatorDashboardSummary(req, res) {
  try {
    const userId = req.user.id;

    const [creatorProfiles] = await pool.query(
      `SELECT *
       FROM creator_profiles
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (!creatorProfiles.length) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const creatorProfile = creatorProfiles[0];
    const creatorId = creatorProfile.id;

    const [channelCountRows] = await pool.query(
      `SELECT COUNT(*) AS total_channels
       FROM channels
       WHERE creator_id = ?`,
      [creatorId]
    );

    const [publishedVideoCountRows] = await pool.query(
      `SELECT COUNT(*) AS published_videos
       FROM videos
       WHERE creator_id = ? AND status = 'published'`,
      [creatorId]
    );

    const [videoCountRows] = await pool.query(
      `SELECT COUNT(*) AS total_videos
       FROM videos
       WHERE creator_id = ?`,
      [creatorId]
    );

    const [channelTotalsRows] = await pool.query(
      `SELECT
          COALESCE(SUM(subscriber_count), 0) AS total_subscribers,
          COALESCE(SUM(total_views), 0) AS total_channel_views
       FROM channels
       WHERE creator_id = ?`,
      [creatorId]
    );

    const [channelIdsRows] = await pool.query(
      `SELECT id
       FROM channels
       WHERE creator_id = ?`,
      [creatorId]
    );

    const channelIds = channelIdsRows.map((row) => row.id);

    let totalWatchTimeSeconds = 0;
    let totalRevenueAmount = 0;
    let totalAnalyticsViews = 0;
    let totalSubscribersGained = 0;

    if (channelIds.length > 0) {
      const [channelAnalyticsRows] = await pool.query(
        `SELECT
            COALESCE(SUM(views), 0) AS total_views,
            COALESCE(SUM(watch_time_seconds), 0) AS total_watch_time_seconds,
            COALESCE(SUM(subscribers_gained), 0) AS total_subscribers_gained,
            COALESCE(SUM(revenue_amount), 0) AS total_revenue_amount
         FROM channel_analytics_daily
         WHERE channel_id IN (?)`,
        [channelIds]
      );

      totalAnalyticsViews = Number(channelAnalyticsRows[0].total_views || 0);
      totalWatchTimeSeconds = Number(channelAnalyticsRows[0].total_watch_time_seconds || 0);
      totalSubscribersGained = Number(channelAnalyticsRows[0].total_subscribers_gained || 0);
      totalRevenueAmount = Number(channelAnalyticsRows[0].total_revenue_amount || 0);
    }

    const [earningsRows] = await pool.query(
      `SELECT
          COALESCE(SUM(amount), 0) AS total_earnings_from_table,
          COALESCE(SUM(CASE WHEN status IN ('approved', 'paid') THEN amount ELSE 0 END), 0) AS approved_earnings
       FROM creator_earnings
       WHERE creator_id = ?`,
      [creatorId]
    );

    const [latestChannels] = await pool.query(
      `SELECT id, channel_name, channel_handle, channel_slug, avatar_url, banner_url, subscriber_count, total_views, total_videos, status, created_at
       FROM channels
       WHERE creator_id = ?
       ORDER BY id DESC
       LIMIT 5`,
      [creatorId]
    );

    const [latestVideos] = await pool.query(
      `SELECT id, uuid, channel_id, title, slug, thumbnail_key, duration_seconds, visibility, status, moderation_status, buy_now_enabled, buy_now_url, published_at, created_at
       FROM videos
       WHERE creator_id = ?
       ORDER BY id DESC
       LIMIT 10`,
      [creatorId]
    );

    return res.status(200).json({
      creator_profile: {
        id: creatorProfile.id,
        user_id: creatorProfile.user_id,
        public_name: creatorProfile.public_name,
        payout_name: creatorProfile.payout_name,
        status: creatorProfile.status,
        monetization_status: creatorProfile.monetization_status,
        total_earnings: creatorProfile.total_earnings,
        available_balance: creatorProfile.available_balance,
        lifetime_views: creatorProfile.lifetime_views,
        lifetime_sales_clicks: creatorProfile.lifetime_sales_clicks,
        created_at: creatorProfile.created_at,
        updated_at: creatorProfile.updated_at,
      },
      summary: {
        total_channels: Number(channelCountRows[0].total_channels || 0),
        total_videos: Number(videoCountRows[0].total_videos || 0),
        published_videos: Number(publishedVideoCountRows[0].published_videos || 0),
        total_subscribers: Number(channelTotalsRows[0].total_subscribers || 0),
        total_views: Number(channelTotalsRows[0].total_channel_views || 0),
        analytics_total_views: totalAnalyticsViews,
        total_watch_time_seconds: totalWatchTimeSeconds,
        total_subscribers_gained: totalSubscribersGained,
        analytics_total_revenue: totalRevenueAmount,
        earnings_total_from_table: Number(earningsRows[0].total_earnings_from_table || 0),
        earnings_approved_total: Number(earningsRows[0].approved_earnings || 0),
      },
      latest_channels: latestChannels,
      latest_videos: latestVideos,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch creator dashboard summary',
      error: error.message,
    });
  }
}

module.exports = {
  getCreatorDashboardSummary,
};