console.log('LOADED CREATOR DASHBOARD CONTROLLER WITH 30 DAY TREND');
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

    const [videoCountRows] = await pool.query(
      `SELECT COUNT(*) AS total_videos
       FROM videos
       WHERE creator_id = ?`,
      [creatorId]
    );

    const [publishedVideoCountRows] = await pool.query(
      `SELECT COUNT(*) AS published_videos
       FROM videos
       WHERE creator_id = ?
         AND status = 'published'
         AND moderation_status = 'approved'`,
      [creatorId]
    );

    const [channelIdsRows] = await pool.query(
      `SELECT id
       FROM channels
       WHERE creator_id = ?`,
      [creatorId]
    );

    const [videoIdsRows] = await pool.query(
      `SELECT id
       FROM videos
       WHERE creator_id = ?`,
      [creatorId]
    );

    const channelIds = channelIdsRows.map((row) => row.id);
    const videoIds = videoIdsRows.map((row) => row.id);

    let totalSubscribers = 0;
    let totalWatchTimeSeconds = 0;
    let totalRevenueAmount = 0;
    let totalSubscribersGained = 0;
    let totalLikes = 0;
    let totalDislikes = 0;

    if (channelIds.length > 0) {
      const [subscriptionRows] = await pool.query(
        `SELECT COUNT(*) AS total_subscribers
         FROM channel_subscriptions
         WHERE channel_id IN (?)`,
        [channelIds]
      );

      totalSubscribers = Number(subscriptionRows[0]?.total_subscribers || 0);

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

      totalWatchTimeSeconds = Number(channelAnalyticsRows[0]?.total_watch_time_seconds || 0);
      totalSubscribersGained = Number(channelAnalyticsRows[0]?.total_subscribers_gained || 0);
      totalRevenueAmount = Number(channelAnalyticsRows[0]?.total_revenue_amount || 0);
    }

    if (videoIds.length > 0) {
      const [reactionRows] = await pool.query(
        `SELECT
            COALESCE(SUM(CASE WHEN reaction_type = 'like' THEN 1 ELSE 0 END), 0) AS total_likes,
            COALESCE(SUM(CASE WHEN reaction_type = 'dislike' THEN 1 ELSE 0 END), 0) AS total_dislikes
         FROM video_reactions
         WHERE video_id IN (?)`,
        [videoIds]
      );

      totalLikes = Number(reactionRows[0]?.total_likes || 0);
      totalDislikes = Number(reactionRows[0]?.total_dislikes || 0);
    }

    const [realViewRows] = await pool.query(
      `SELECT COALESCE(COUNT(vv.id), 0) AS total_views
       FROM video_views vv
       INNER JOIN videos v ON v.id = vv.video_id
       WHERE v.creator_id = ?`,
      [creatorId]
    );

    const [realCommentRows] = await pool.query(
      `SELECT COALESCE(COUNT(c.id), 0) AS total_comments
       FROM comments c
       INNER JOIN videos v ON v.id = c.video_id
       WHERE v.creator_id = ?
         AND c.status = 'active'`,
      [creatorId]
    );

    const [realShareRows] = await pool.query(
      `SELECT COALESCE(COUNT(vs.id), 0) AS total_shares
       FROM video_shares vs
       INNER JOIN videos v ON v.id = vs.video_id
       WHERE v.creator_id = ?`,
      [creatorId]
    );

    const [productClickRows] = await pool.query(
      `SELECT COALESCE(COUNT(pc.id), 0) AS total_product_clicks
       FROM product_clicks pc
       WHERE pc.creator_id = ?`,
      [creatorId]
    );

    const [earningsRows] = await pool.query(
      `SELECT
          COALESCE(SUM(amount), 0) AS total_earnings_from_table,
          COALESCE(SUM(CASE WHEN status IN ('approved', 'paid') THEN amount ELSE 0 END), 0) AS approved_earnings
       FROM creator_earnings
       WHERE creator_id = ?`,
      [creatorId]
    );

    const [latestChannels] = await pool.query(
      `SELECT
          ch.id,
          ch.channel_name,
          ch.channel_handle,
          ch.channel_slug,
          ch.avatar_url,
          ch.banner_url,
          ch.status,
          ch.created_at,
          (
            SELECT COUNT(*)
            FROM channel_subscriptions cs
            WHERE cs.channel_id = ch.id
          ) AS subscriber_count,
          (
            SELECT COUNT(*)
            FROM videos v
            WHERE v.channel_id = ch.id
              AND v.status = 'published'
              AND v.moderation_status = 'approved'
              AND v.visibility = 'public'
          ) AS total_videos,
          (
            SELECT COUNT(*)
            FROM video_views vv
            INNER JOIN videos v ON v.id = vv.video_id
            WHERE v.channel_id = ch.id
              AND v.status = 'published'
              AND v.moderation_status = 'approved'
              AND v.visibility = 'public'
          ) AS total_views
       FROM channels ch
       WHERE ch.creator_id = ?
       ORDER BY ch.id DESC
       LIMIT 5`,
      [creatorId]
    );

    const [latestVideos] = await pool.query(
      `SELECT
          v.id,
          v.uuid,
          v.channel_id,
          v.title,
          v.slug,
          v.thumbnail_key,
          v.duration_seconds,
          v.visibility,
          v.status,
          v.moderation_status,
          v.buy_now_enabled,
          v.buy_now_url,
          v.published_at,
          v.created_at,
          COALESCE(vv.views_count, 0) AS views_count,
          COALESCE(cc.comments_count, 0) AS comments_count,
          COALESCE(ss.shares_count, 0) AS shares_count
       FROM videos v
       LEFT JOIN (
         SELECT video_id, COUNT(*) AS views_count
         FROM video_views
         GROUP BY video_id
       ) vv ON vv.video_id = v.id
       LEFT JOIN (
         SELECT video_id, COUNT(*) AS comments_count
         FROM comments
         WHERE status = 'active'
         GROUP BY video_id
       ) cc ON cc.video_id = v.id
       LEFT JOIN (
         SELECT video_id, COUNT(*) AS shares_count
         FROM video_shares
         GROUP BY video_id
       ) ss ON ss.video_id = v.id
       WHERE v.creator_id = ?
       ORDER BY v.id DESC
       LIMIT 10`,
      [creatorId]
    );

    const [trendRows] = await pool.query(
      `
      WITH RECURSIVE last_30_days AS (
        SELECT CURDATE() - INTERVAL 29 DAY AS day_date
        UNION ALL
        SELECT day_date + INTERVAL 1 DAY
        FROM last_30_days
        WHERE day_date < CURDATE()
      )
      SELECT
        d.day_date AS analytics_date,
        COALESCE(vv.views_count, 0) AS views_count,
        COALESCE(pc.product_clicks, 0) AS product_clicks,
        COALESCE(cc.comments_count, 0) AS comments_count,
        COALESCE(ss.shares_count, 0) AS shares_count
      FROM last_30_days d
      LEFT JOIN (
        SELECT DATE(vv.created_at) AS analytics_date, COUNT(*) AS views_count
        FROM video_views vv
        INNER JOIN videos v ON v.id = vv.video_id
        WHERE v.creator_id = ?
        GROUP BY DATE(vv.created_at)
      ) vv ON vv.analytics_date = d.day_date
      LEFT JOIN (
        SELECT DATE(pc.created_at) AS analytics_date, COUNT(*) AS product_clicks
        FROM product_clicks pc
        WHERE pc.creator_id = ?
        GROUP BY DATE(pc.created_at)
      ) pc ON pc.analytics_date = d.day_date
      LEFT JOIN (
        SELECT DATE(c.created_at) AS analytics_date, COUNT(*) AS comments_count
        FROM comments c
        INNER JOIN videos v ON v.id = c.video_id
        WHERE v.creator_id = ?
          AND c.status = 'active'
        GROUP BY DATE(c.created_at)
      ) cc ON cc.analytics_date = d.day_date
      LEFT JOIN (
        SELECT DATE(vs.created_at) AS analytics_date, COUNT(*) AS shares_count
        FROM video_shares vs
        INNER JOIN videos v ON v.id = vs.video_id
        WHERE v.creator_id = ?
        GROUP BY DATE(vs.created_at)
      ) ss ON ss.analytics_date = d.day_date
      ORDER BY d.day_date ASC
      `,
      [creatorId, creatorId, creatorId, creatorId]
    );

    const totalViews = Number(realViewRows[0]?.total_views || 0);
    const productClicks =
      Number(productClickRows[0]?.total_product_clicks || 0) ||
      Number(creatorProfile.lifetime_sales_clicks || 0);

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
        lifetime_views: Number(creatorProfile.lifetime_views || 0),
        lifetime_sales_clicks: Number(creatorProfile.lifetime_sales_clicks || 0),
        created_at: creatorProfile.created_at,
        updated_at: creatorProfile.updated_at,
      },
      summary: {
        total_channels: Number(channelCountRows[0]?.total_channels || 0),
        total_videos: Number(videoCountRows[0]?.total_videos || 0),
        published_videos: Number(publishedVideoCountRows[0]?.published_videos || 0),
        total_subscribers: totalSubscribers,
        total_views: totalViews,
        analytics_total_views: totalViews,
        product_clicks: productClicks,
        total_cta_clicks: productClicks,
        total_shares: Number(realShareRows[0]?.total_shares || 0),
        total_watch_time_seconds: totalWatchTimeSeconds,
        total_subscribers_gained: totalSubscribersGained,
        total_comments: Number(realCommentRows[0]?.total_comments || 0),
        total_likes: totalLikes,
        total_dislikes: totalDislikes,
        analytics_total_revenue: totalRevenueAmount,
        earnings_total_from_table: Number(
          earningsRows[0]?.total_earnings_from_table || 0
        ),
        earnings_approved_total: Number(earningsRows[0]?.approved_earnings || 0),
      },
      trend_30_days: trendRows.map((row) => ({
        analytics_date: row.analytics_date,
        views_count: Number(row.views_count || 0),
        product_clicks: Number(row.product_clicks || 0),
        comments_count: Number(row.comments_count || 0),
        shares_count: Number(row.shares_count || 0),
      })),
      latest_channels: latestChannels.map((channel) => ({
        ...channel,
        subscriber_count: Number(channel.subscriber_count || 0),
        total_videos: Number(channel.total_videos || 0),
        total_views: Number(channel.total_views || 0),
      })),
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