const pool = require('../config/db');

function toYmd(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function getTodayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayYmd() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function normalizeDateRange(query = {}) {
  const singleDate =
    String(query.date || query.day || '').trim() ||
    '';

  const startDateInput =
    String(query.start_date || query.from || '').trim() ||
    '';

  const endDateInput =
    String(query.end_date || query.to || '').trim() ||
    '';

  let startDate = toYmd(singleDate || startDateInput) || getTodayYmd();
  let endDate = toYmd(singleDate || endDateInput) || startDate;

  if (startDate > endDate) {
    const temp = startDate;
    startDate = endDate;
    endDate = temp;
  }

  return {
    start_date: startDate,
    end_date: endDate,
    yesterday_date: getYesterdayYmd(),
    today_date: getTodayYmd(),
  };
}

function buildDateSeries(startDate, endDate) {
  const dates = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function mapRowsByDate(rows = [], keyName = 'analytics_date') {
  const map = new Map();

  rows.forEach((row) => {
    const dateKey = toYmd(row?.[keyName] || row?.date_key || row?.event_date);
    if (!dateKey) return;

    map.set(dateKey, {
      analytics_date: dateKey,
      visitors: Number(row?.visitors || 0),
      video_views: Number(row?.video_views || 0),
      buy_now_clicks: Number(row?.buy_now_clicks || 0),
    });
  });

  return map;
}

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

async function getAdminPlatformAnalytics(req, res) {
  try {
    const { start_date, end_date, today_date, yesterday_date } = normalizeDateRange(req.query);
    const dateSeries = buildDateSeries(start_date, end_date);

    const [rangeVisitorRows] = await pool.query(
      `SELECT
         COUNT(DISTINCT
           COALESCE(
             NULLIF(session_id, ''),
             NULLIF(ip_hash, ''),
             CASE WHEN user_id IS NOT NULL THEN CONCAT('user:', user_id) ELSE NULL END,
             CONCAT('view:', id)
           )
         ) AS total_visitors
       FROM video_views
       WHERE DATE(created_at) BETWEEN ? AND ?`,
      [start_date, end_date]
    );

    const [rangeViewRows] = await pool.query(
      `SELECT COUNT(*) AS total_video_views
       FROM video_views
       WHERE DATE(created_at) BETWEEN ? AND ?`,
      [start_date, end_date]
    );

    const [rangeClickRows] = await pool.query(
      `SELECT COUNT(*) AS total_buy_now_clicks
       FROM product_clicks
       WHERE DATE(created_at) BETWEEN ? AND ?`,
      [start_date, end_date]
    );

    const [rangeVideosWithClicksRows] = await pool.query(
      `SELECT COUNT(DISTINCT video_id) AS total_videos_with_clicks
       FROM product_clicks
       WHERE DATE(created_at) BETWEEN ? AND ?`,
      [start_date, end_date]
    );

    const [todayVisitorRows] = await pool.query(
      `SELECT
         COUNT(DISTINCT
           COALESCE(
             NULLIF(session_id, ''),
             NULLIF(ip_hash, ''),
             CASE WHEN user_id IS NOT NULL THEN CONCAT('user:', user_id) ELSE NULL END,
             CONCAT('view:', id)
           )
         ) AS total_visitors
       FROM video_views
       WHERE DATE(created_at) = ?`,
      [today_date]
    );

    const [yesterdayVisitorRows] = await pool.query(
      `SELECT
         COUNT(DISTINCT
           COALESCE(
             NULLIF(session_id, ''),
             NULLIF(ip_hash, ''),
             CASE WHEN user_id IS NOT NULL THEN CONCAT('user:', user_id) ELSE NULL END,
             CONCAT('view:', id)
           )
         ) AS total_visitors
       FROM video_views
       WHERE DATE(created_at) = ?`,
      [yesterday_date]
    );

    const [todayViewRows] = await pool.query(
      `SELECT COUNT(*) AS total_video_views
       FROM video_views
       WHERE DATE(created_at) = ?`,
      [today_date]
    );

    const [yesterdayViewRows] = await pool.query(
      `SELECT COUNT(*) AS total_video_views
       FROM video_views
       WHERE DATE(created_at) = ?`,
      [yesterday_date]
    );

    const [todayClickRows] = await pool.query(
      `SELECT COUNT(*) AS total_buy_now_clicks
       FROM product_clicks
       WHERE DATE(created_at) = ?`,
      [today_date]
    );

    const [yesterdayClickRows] = await pool.query(
      `SELECT COUNT(*) AS total_buy_now_clicks
       FROM product_clicks
       WHERE DATE(created_at) = ?`,
      [yesterday_date]
    );

    const [dailyVisitorRows] = await pool.query(
      `SELECT
         DATE(created_at) AS analytics_date,
         COUNT(DISTINCT
           COALESCE(
             NULLIF(session_id, ''),
             NULLIF(ip_hash, ''),
             CASE WHEN user_id IS NOT NULL THEN CONCAT('user:', user_id) ELSE NULL END,
             CONCAT('view:', id)
           )
         ) AS visitors
       FROM video_views
       WHERE DATE(created_at) BETWEEN ? AND ?
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`,
      [start_date, end_date]
    );

    const [dailyViewRows] = await pool.query(
      `SELECT
         DATE(created_at) AS analytics_date,
         COUNT(*) AS video_views
       FROM video_views
       WHERE DATE(created_at) BETWEEN ? AND ?
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`,
      [start_date, end_date]
    );

    const [dailyClickRows] = await pool.query(
      `SELECT
         DATE(created_at) AS analytics_date,
         COUNT(*) AS buy_now_clicks
       FROM product_clicks
       WHERE DATE(created_at) BETWEEN ? AND ?
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`,
      [start_date, end_date]
    );

    const [topVideosRows] = await pool.query(
      `SELECT
         v.id,
         v.title,
         v.slug,
         v.thumbnail_key,
         COUNT(pc.id) AS buy_now_clicks,
         (
           SELECT COUNT(*)
           FROM video_views vv
           WHERE vv.video_id = v.id
             AND DATE(vv.created_at) BETWEEN ? AND ?
         ) AS video_views
       FROM product_clicks pc
       INNER JOIN videos v ON v.id = pc.video_id
       WHERE DATE(pc.created_at) BETWEEN ? AND ?
       GROUP BY v.id, v.title, v.slug, v.thumbnail_key
       ORDER BY buy_now_clicks DESC, video_views DESC, v.id DESC`,
      [start_date, end_date, start_date, end_date]
    );

    const [viewsByVideoRows] = await pool.query(
      `SELECT
         v.id,
         v.title,
         v.slug,
         v.thumbnail_key,
         COUNT(vv.id) AS video_views
       FROM video_views vv
       INNER JOIN videos v ON v.id = vv.video_id
       WHERE DATE(vv.created_at) BETWEEN ? AND ?
       GROUP BY v.id, v.title, v.slug, v.thumbnail_key
       ORDER BY video_views DESC, v.id DESC`,
      [start_date, end_date]
    );

    const viewsByVideoMap = new Map();
    viewsByVideoRows.forEach((row) => {
      viewsByVideoMap.set(Number(row.id), {
        id: Number(row.id),
        title: row.title,
        slug: row.slug,
        thumbnail_key: row.thumbnail_key || null,
        video_views: Number(row.video_views || 0),
        buy_now_clicks: 0,
      });
    });

    topVideosRows.forEach((row) => {
      const existing = viewsByVideoMap.get(Number(row.id));
      if (existing) {
        existing.buy_now_clicks = Number(row.buy_now_clicks || 0);
      } else {
        viewsByVideoMap.set(Number(row.id), {
          id: Number(row.id),
          title: row.title,
          slug: row.slug,
          thumbnail_key: row.thumbnail_key || null,
          video_views: Number(row.video_views || 0),
          buy_now_clicks: Number(row.buy_now_clicks || 0),
        });
      }
    });

    const visitorMap = mapRowsByDate(dailyVisitorRows);
    const viewsMap = mapRowsByDate(dailyViewRows);
    const clicksMap = mapRowsByDate(dailyClickRows);

    const daily_breakdown = dateSeries.map((dateKey) => ({
      analytics_date: dateKey,
      visitors: Number(visitorMap.get(dateKey)?.visitors || 0),
      video_views: Number(viewsMap.get(dateKey)?.video_views || 0),
      buy_now_clicks: Number(clicksMap.get(dateKey)?.buy_now_clicks || 0),
    }));

    const videos_breakdown = Array.from(viewsByVideoMap.values()).sort((a, b) => {
      const clickDiff = Number(b.buy_now_clicks || 0) - Number(a.buy_now_clicks || 0);
      if (clickDiff !== 0) return clickDiff;
      return Number(b.video_views || 0) - Number(a.video_views || 0);
    });

    return res.status(200).json({
      date_range: {
        start_date,
        end_date,
      },
      summary: {
        total_visitors: Number(rangeVisitorRows[0]?.total_visitors || 0),
        total_video_views: Number(rangeViewRows[0]?.total_video_views || 0),
        total_buy_now_clicks: Number(rangeClickRows[0]?.total_buy_now_clicks || 0),
        total_videos_with_clicks: Number(
          rangeVideosWithClicksRows[0]?.total_videos_with_clicks || 0
        ),
      },
      today: {
        date: today_date,
        total_visitors: Number(todayVisitorRows[0]?.total_visitors || 0),
        total_video_views: Number(todayViewRows[0]?.total_video_views || 0),
        total_buy_now_clicks: Number(todayClickRows[0]?.total_buy_now_clicks || 0),
      },
      yesterday: {
        date: yesterday_date,
        total_visitors: Number(yesterdayVisitorRows[0]?.total_visitors || 0),
        total_video_views: Number(yesterdayViewRows[0]?.total_video_views || 0),
        total_buy_now_clicks: Number(yesterdayClickRows[0]?.total_buy_now_clicks || 0),
      },
      daily_breakdown,
      videos_breakdown,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch admin platform analytics',
      error: error.message,
    });
  }
}

module.exports = {
  getCreatorAnalyticsOverview,
  getChannelAnalytics,
  getVideoAnalytics,
  getAdminPlatformAnalytics,
};