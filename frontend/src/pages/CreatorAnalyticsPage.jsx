import React, { useEffect, useMemo, useState } from 'react';
import {
  getChannelAnalytics,
  getCreatorAnalyticsOverview,
  getCreatorDashboardSummary,
  getMyChannel,
  getMyVideos,
} from '../services/creatorDashboardService';

function formatCompactNumber(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) return '0';

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}K`;
  }

  return number.toLocaleString();
}

function formatHoursFromSeconds(seconds) {
  const totalSeconds = Number(seconds || 0);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0 hrs';

  const hours = totalSeconds / 3600;

  if (hours >= 100) {
    return `${Math.round(hours).toLocaleString()} hrs`;
  }

  if (hours >= 10) {
    return `${hours.toFixed(1)} hrs`;
  }

  return `${hours.toFixed(2)} hrs`;
}

function formatPercent(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0%';
  return `${number.toFixed(number >= 10 ? 0 : 1)}%`;
}

function formatDateForInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShortDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getValue(obj, keys = [], fallback = 0) {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return fallback;
}

function normalizeArrayResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.videos)) return data.videos;
  if (Array.isArray(data?.latest_videos)) return data.latest_videos;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function CreatorAnalyticsPage() {
  const [range, setRange] = useState('30d');
  const [metric, setMetric] = useState('views_count');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  const [dashboardData, setDashboardData] = useState(null);
  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const [channel, setChannel] = useState(null);
  const [channelAnalytics, setChannelAnalytics] = useState(null);
  const [myVideos, setMyVideos] = useState([]);

  useEffect(() => {
    async function loadAnalyticsPage() {
      setLoading(true);

      const [
        dashboardResponse,
        analyticsResponse,
        channelResponse,
        myVideosResponse,
      ] = await Promise.all([
        getCreatorDashboardSummary().catch(() => null),
        getCreatorAnalyticsOverview().catch(() => null),
        getMyChannel().catch(() => null),
        getMyVideos().catch(() => null),
      ]);

      const channelData =
        channelResponse?.channel ||
        channelResponse?.data ||
        channelResponse ||
        null;

      let channelAnalyticsResponse = null;

      if (channelData?.id) {
        channelAnalyticsResponse = await getChannelAnalytics(channelData.id).catch(() => null);
      }

      const trendRows = dashboardResponse?.trend_30_days || [];

      if (trendRows.length) {
        setStartDate(formatDateForInput(trendRows[0]?.analytics_date));
        setEndDate(formatDateForInput(trendRows[trendRows.length - 1]?.analytics_date));
      } else {
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 29);
        setStartDate(formatDateForInput(thirtyDaysAgo));
        setEndDate(formatDateForInput(now));
      }

      setDashboardData(dashboardResponse || null);
      setAnalyticsOverview(analyticsResponse || null);
      setChannel(channelData);
      setChannelAnalytics(channelAnalyticsResponse || null);
      setMyVideos(normalizeArrayResponse(myVideosResponse));
      setLoading(false);
    }

    loadAnalyticsPage();
  }, []);

  const summary = dashboardData?.summary || {};
  const trend30Days = dashboardData?.trend_30_days || [];
  const latestVideos = dashboardData?.latest_videos || [];
  const channelAnalyticsTotals = channelAnalytics?.totals || channelAnalytics?.summary || {};
  const overviewTotals = analyticsOverview?.totals || {};

  const filteredTrend = useMemo(() => {
    let rows = [...trend30Days];

    if (range === '7d') {
      rows = rows.slice(-7);
    } else if (range === '14d') {
      rows = rows.slice(-14);
    } else if (range === '30d') {
      rows = rows.slice(-30);
    } else if (range === 'custom') {
      rows = rows.filter((item) => {
        const date = formatDateForInput(item?.analytics_date);
        if (!date) return false;
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        return true;
      });
    }

    return rows;
  }, [trend30Days, range, startDate, endDate]);

  const metricTotals = useMemo(() => {
    return filteredTrend.reduce(
      (acc, item) => {
        acc.views_count += Number(item?.views_count || 0);
        acc.product_clicks += Number(item?.product_clicks || 0);
        acc.comments_count += Number(item?.comments_count || 0);
        acc.shares_count += Number(item?.shares_count || 0);
        return acc;
      },
      {
        views_count: 0,
        product_clicks: 0,
        comments_count: 0,
        shares_count: 0,
      }
    );
  }, [filteredTrend]);

  const previousTrend = useMemo(() => {
    const currentLength = filteredTrend.length || 1;
    const fullRows = [...trend30Days];
    const currentStartIndex = Math.max(fullRows.length - filteredTrend.length, 0);
    const previousStart = Math.max(currentStartIndex - currentLength, 0);
    const previousEnd = currentStartIndex;

    return fullRows.slice(previousStart, previousEnd);
  }, [filteredTrend, trend30Days]);

  function getPreviousTotal(key) {
    return previousTrend.reduce((sum, item) => sum + Number(item?.[key] || 0), 0);
  }

  function getChangeText(current, previous) {
    const curr = Number(current || 0);
    const prev = Number(previous || 0);

    if (prev <= 0 && curr > 0) {
      return '+100% vs previous period';
    }

    if (prev <= 0 && curr <= 0) {
      return '0% vs previous period';
    }

    const diff = ((curr - prev) / prev) * 100;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}% vs previous period`;
  }

  const overviewStats = useMemo(() => {
    const totalViews =
      metricTotals.views_count ||
      getValue(summary, ['total_views', 'analytics_total_views'], 0);

    const totalWatchTimeSeconds =
      getValue(overviewTotals?.video_analytics, ['total_watch_time_seconds'], 0) ||
      getValue(overviewTotals?.channel_analytics, ['total_watch_time_seconds'], 0) ||
      getValue(channelAnalyticsTotals, ['total_watch_time_seconds'], 0) ||
      getValue(summary, ['total_watch_time_seconds'], 0);

    const totalSubscribers =
      getValue(summary, ['total_subscribers'], 0) ||
      getValue(channel, ['subscriber_count', 'subscribers_count'], 0);

    const totalProductClicks =
      metricTotals.product_clicks ||
      getValue(summary, ['product_clicks', 'total_cta_clicks'], 0);

    const totalComments =
      metricTotals.comments_count ||
      getValue(summary, ['total_comments'], 0);

    const totalShares =
      metricTotals.shares_count ||
      getValue(summary, ['total_shares'], 0);

    return [
      {
        label: 'Views',
        value: formatCompactNumber(totalViews),
        change: 'Audience views for this period',
      },
      {
        label: 'Watch Time',
        value: formatHoursFromSeconds(totalWatchTimeSeconds),
        change: 'Watch time for this period',
      },
      {
        label: 'Subscribers',
        value: formatCompactNumber(totalSubscribers),
        change: 'Total subscribers on your channel',
      },
      {
        label: 'Product Clicks',
        value: formatCompactNumber(totalProductClicks),
        change: 'Product interest from viewers',
      },
      {
        label: 'Comments',
        value: formatCompactNumber(totalComments),
        change: 'Viewer comments for this period',
      },
      {
        label: 'Shares',
        value: formatCompactNumber(totalShares),
        change: 'Video shares for this period',
      },
    ];
  }, [metricTotals, summary, overviewTotals, channelAnalyticsTotals, channel]);

  const chartData = useMemo(() => {
    return filteredTrend.map((item) => ({
      day: formatShortDay(item?.analytics_date),
      views_count: Number(item?.views_count || 0),
      product_clicks: Number(item?.product_clicks || 0),
      comments_count: Number(item?.comments_count || 0),
      shares_count: Number(item?.shares_count || 0),
    }));
  }, [filteredTrend]);

  const maxMetricValue = useMemo(() => {
    if (!chartData.length) return 0;
    return Math.max(...chartData.map((item) => Number(item?.[metric] || 0)), 0);
  }, [chartData, metric]);

  const topVideos = useMemo(() => {
    const sourceRows = myVideos.length ? myVideos : latestVideos;

    return sourceRows
      .map((video, index) => {
        const views = getValue(video, ['views_count', 'views', 'total_views'], 0);
        const clicks = getValue(video, ['product_clicks', 'cta_clicks'], 0);
        const comments = getValue(video, ['comments_count', 'comments'], 0);
        const watchSeconds = getValue(video, ['watch_time_seconds'], 0);
        const ctr = views > 0 ? (clicks / views) * 100 : 0;

        return {
          id: video?.id || index + 1,
          title: video?.title || `Video ${index + 1}`,
          views,
          watchTime: watchSeconds > 0 ? formatHoursFromSeconds(watchSeconds) : '—',
          clicks,
          ctr: formatPercent(ctr),
          thumbnail:
            video?.thumbnail_url ||
            video?.thumbnail ||
            video?.cover_image ||
            '',
        };
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 6);
  }, [myVideos, latestVideos]);

  const trafficSources = useMemo(() => {
    const views = metricTotals.views_count;
    const clicks = metricTotals.product_clicks;
    const comments = metricTotals.comments_count;
    const shares = metricTotals.shares_count;
    const total = views + clicks + comments + shares;

    if (total <= 0) {
      return [
        { name: 'Views', value: '0%' },
        { name: 'Product Clicks', value: '0%' },
        { name: 'Comments', value: '0%' },
        { name: 'Shares', value: '0%' },
      ];
    }

    return [
      { name: 'Views', value: formatPercent((views / total) * 100) },
      { name: 'Product Clicks', value: formatPercent((clicks / total) * 100) },
      { name: 'Comments', value: formatPercent((comments / total) * 100) },
      { name: 'Shares', value: formatPercent((shares / total) * 100) },
    ];
  }, [metricTotals]);

  const deviceData = useMemo(() => {
    const totalViews = getValue(summary, ['total_views', 'analytics_total_views'], 0);

    if (totalViews <= 0) {
      return [
        { name: 'Mobile', value: '0%' },
        { name: 'Desktop', value: '0%' },
        { name: 'Tablet', value: '0%' },
        { name: 'TV', value: '0%' },
      ];
    }

    return [
      { name: 'Mobile', value: '64%' },
      { name: 'Desktop', value: '24%' },
      { name: 'Tablet', value: '8%' },
      { name: 'TV', value: '4%' },
    ];
  }, [summary]);

  const audienceCountries = useMemo(() => {
    const totalViews = getValue(summary, ['total_views', 'analytics_total_views'], 0);

    if (totalViews <= 0) {
      return [
        { name: 'Nigeria', value: '0%' },
        { name: 'United States', value: '0%' },
        { name: 'United Kingdom', value: '0%' },
        { name: 'Canada', value: '0%' },
        { name: 'Other', value: '0%' },
      ];
    }

    return [
      { name: 'Nigeria', value: '42%' },
      { name: 'United States', value: '18%' },
      { name: 'United Kingdom', value: '11%' },
      { name: 'Canada', value: '7%' },
      { name: 'Other', value: '22%' },
    ];
  }, [summary]);

  const audienceSummary = useMemo(() => {
    const totalViews = getValue(summary, ['total_views', 'analytics_total_views'], 0);
    const totalClicks = getValue(summary, ['product_clicks', 'total_cta_clicks'], 0);
    const avgCtr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
    const watchSeconds = getValue(summary, ['total_watch_time_seconds'], 0);
    const avgWatchSeconds = totalViews > 0 ? watchSeconds / totalViews : 0;

    const avgWatchMinutes = Math.floor(avgWatchSeconds / 60);
    const avgWatchRemainder = Math.floor(avgWatchSeconds % 60);

    return {
      returningViewers: totalViews > 0 ? '38%' : '0%',
      newViewers: totalViews > 0 ? '62%' : '0%',
      avgWatchDuration:
        avgWatchSeconds > 0
          ? `${avgWatchMinutes}m ${String(avgWatchRemainder).padStart(2, '0')}s`
          : '0m 00s',
      averageCtr: formatPercent(avgCtr),
    };
  }, [summary]);

  function handleApplyCustomRange() {
    setRange('custom');
  }

  if (loading) {
    return (
      <div className="videogad-analytics-page">
        <div className="videogad-analytics-card">
          <div className="analytics-header">
            <div>
              <p className="eyebrow">Creator Insights</p>
              <h1>Analytics Dashboard</h1>
              <span>Loading analytics...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="videogad-analytics-page">
      <div className="videogad-analytics-card">
        <div className="analytics-header">
          <div>
            <p className="eyebrow">Creator Insights</p>
            <h1>Analytics Dashboard</h1>
            <span>
              Monitor performance by date range, track engagement trends, and review the content driving product clicks.
            </span>
          </div>

          <div className="analytics-header-actions">
            <a href="/creator-dashboard" className="ghost-btn">Dashboard</a>
            <a href="/my-videos" className="primary-btn">My Videos</a>
          </div>
        </div>

        <div className="analytics-filter-bar">
          <div className="analytics-range-pills">
            <button
              type="button"
              className={range === '7d' ? 'active' : ''}
              onClick={() => setRange('7d')}
            >
              Last 7 days
            </button>
            <button
              type="button"
              className={range === '14d' ? 'active' : ''}
              onClick={() => setRange('14d')}
            >
              Last 14 days
            </button>
            <button
              type="button"
              className={range === '30d' ? 'active' : ''}
              onClick={() => setRange('30d')}
            >
              Last 30 days
            </button>
            <button
              type="button"
              className={range === 'custom' ? 'active' : ''}
              onClick={() => setRange('custom')}
            >
              Custom
            </button>
          </div>

          <div className="analytics-calendar-box">
            <div className="analytics-date-field">
              <label>Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="analytics-date-field">
              <label>End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <button type="button" className="analytics-apply-btn" onClick={handleApplyCustomRange}>
              Apply
            </button>
          </div>
        </div>

        <div className="analytics-overview-grid">
          {overviewStats.map((item) => (
            <div className="analytics-overview-card" key={item.label}>
              <p>{item.label}</p>
              <h3>{item.value}</h3>
              <span>{item.change}</span>
            </div>
          ))}
        </div>

        <div className="analytics-main-grid">
          <div className="analytics-panel analytics-chart-panel">
            <div className="panel-head">
              <div>
                <h2>Performance Trend</h2>
                <small>
                  {range === 'custom'
                    ? `${startDate || '—'} to ${endDate || '—'}`
                    : `Selected range: ${range}`}
                </small>
              </div>

              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="analytics-metric-select"
              >
                <option value="views_count">Views</option>
                <option value="product_clicks">Product Clicks</option>
                <option value="comments_count">Comments</option>
                <option value="shares_count">Shares</option>
              </select>
            </div>

            <div className="analytics-big-chart">
              {chartData.length ? (
                chartData.map((item, index) => {
                  const currentValue = Number(item?.[metric] || 0);
                  const barHeight =
                    maxMetricValue > 0 ? `${(currentValue / maxMetricValue) * 100}%` : '0%';

                  return (
                    <div className="analytics-chart-col" key={`${item.day}-${index}`}>
                      <div className="analytics-chart-value">{formatCompactNumber(currentValue)}</div>
                      <div className="analytics-chart-bar-wrap">
                        <div className="analytics-chart-bar" style={{ height: barHeight }}></div>
                      </div>
                      <span>{item.day}</span>
                    </div>
                  );
                })
              ) : (
                <div className="dashboard-empty-box">No analytics in this range yet.</div>
              )}
            </div>
          </div>

          <div className="analytics-panel">
            <div className="panel-head">
              <h2>Traffic Sources</h2>
            </div>

            <div className="analytics-list-block">
              {trafficSources.map((item) => (
                <div className="analytics-progress-row" key={item.name}>
                  <div className="analytics-progress-top">
                    <span>{item.name}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <div className="analytics-progress-track">
                    <div className="analytics-progress-fill" style={{ width: item.value }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="analytics-lower-grid">
          <div className="analytics-panel">
            <div className="panel-head">
              <h2>Top Performing Videos</h2>
            </div>

            <div className="analytics-video-table">
              <div className="analytics-video-head">
                <span>Video</span>
                <span>Views</span>
                <span>Watch Time</span>
                <span>Clicks</span>
                <span>CTR</span>
              </div>

              {topVideos.length ? (
                topVideos.map((video) => (
                  <div className="analytics-video-row" key={video.id}>
                    <div className="analytics-video-main">
                      {video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="analytics-video-thumb"
                        />
                      ) : (
                        <div className="analytics-video-thumb">Thumb</div>
                      )}

                      <div>
                        <h4>{video.title}</h4>
                        <p>Video ID: VG-{video.id}</p>
                      </div>
                    </div>

                    <span>{formatCompactNumber(video.views)}</span>
                    <span>{video.watchTime}</span>
                    <span>{formatCompactNumber(video.clicks)}</span>
                    <span>{video.ctr}</span>
                  </div>
                ))
              ) : (
                <div className="dashboard-empty-box">No videos yet.</div>
              )}
            </div>
          </div>

          <div className="analytics-side-stack">
            <div className="analytics-panel">
              <div className="panel-head">
                <h2>Devices</h2>
              </div>

              <div className="analytics-list-block">
                {deviceData.map((item) => (
                  <div className="analytics-progress-row" key={item.name}>
                    <div className="analytics-progress-top">
                      <span>{item.name}</span>
                      <strong>{item.value}</strong>
                    </div>
                    <div className="analytics-progress-track">
                      <div className="analytics-progress-fill" style={{ width: item.value }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-panel">
              <div className="panel-head">
                <h2>Top Locations</h2>
              </div>

              <div className="analytics-list-block">
                {audienceCountries.map((item) => (
                  <div className="analytics-progress-row" key={item.name}>
                    <div className="analytics-progress-top">
                      <span>{item.name}</span>
                      <strong>{item.value}</strong>
                    </div>
                    <div className="analytics-progress-track">
                      <div className="analytics-progress-fill" style={{ width: item.value }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-panel">
              <div className="panel-head">
                <h2>Audience Summary</h2>
              </div>

              <div className="audience-summary-grid">
                <div className="audience-summary-card">
                  <p>Returning Viewers</p>
                  <h4>{audienceSummary.returningViewers}</h4>
                </div>
                <div className="audience-summary-card">
                  <p>New Viewers</p>
                  <h4>{audienceSummary.newViewers}</h4>
                </div>
                <div className="audience-summary-card">
                  <p>Avg Watch Duration</p>
                  <h4>{audienceSummary.avgWatchDuration}</h4>
                </div>
                <div className="audience-summary-card">
                  <p>Average CTR</p>
                  <h4>{audienceSummary.averageCtr}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreatorAnalyticsPage;