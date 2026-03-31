import React, { useEffect, useMemo, useState } from 'react';
import '../creator-dashboard.css';
import {
  getCreatorAnalyticsOverview,
  getCreatorDashboardSummary,
  getCurrentExternalPostingSubscription,
  getMarketplaceAuthStatus,
  getMyChannel,
} from '../services/creatorDashboardService';

function getObject(data, key = null) {
  if (!data) return null;
  if (key && data?.[key] && typeof data[key] === 'object') return data[key];
  if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) return data.data;
  return data;
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

function formatCompactNumber(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) return String(value || 0);

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}K`;
  }

  return number.toLocaleString();
}

function formatDateLabel(value) {
  if (!value) return 'Recently added';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }

  return date.toLocaleDateString();
}

function formatShortDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function normalizeStatus(value) {
  const raw = String(value || '').trim().toLowerCase();

  if (!raw) return 'Draft';
  if (raw.includes('publish')) return 'Published';
  if (raw.includes('pending')) return 'Pending Review';
  if (raw.includes('review')) return 'Pending Review';
  if (raw.includes('reject')) return 'Rejected';
  if (raw.includes('draft')) return 'Draft';

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusClass(status) {
  return normalizeStatus(status).toLowerCase().replace(/\s+/g, '-');
}

function secondsToShortText(seconds) {
  const total = Number(seconds || 0);
  if (!Number.isFinite(total) || total <= 0) return '30 day activity trend';

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m watch time`;
  return `${minutes}m watch time`;
}

function CreatorDashboardPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem('creator_dashboard_theme') || 'dark'
  );
  const [channel, setChannel] = useState(null);
  const [summary, setSummary] = useState(null);
  const [latestVideos, setLatestVideos] = useState([]);
  const [trend30Days, setTrend30Days] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('views_count');
  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const [marketplaceAuth, setMarketplaceAuth] = useState(null);
  const [externalPosting, setExternalPosting] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('creator_dashboard_theme', theme);
  }, [theme]);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      const [
        dashboardResponse,
        analyticsResponse,
        channelResponse,
        marketplaceResponse,
        externalPostingResponse,
      ] = await Promise.all([
        getCreatorDashboardSummary().catch(() => null),
        getCreatorAnalyticsOverview().catch(() => null),
        getMyChannel().catch(() => null),
        getMarketplaceAuthStatus().catch(() => null),
        getCurrentExternalPostingSubscription().catch(() => null),
      ]);

      const dashboardData = getObject(dashboardResponse);
      const analyticsData = getObject(analyticsResponse);
      const channelData =
        getObject(channelResponse, 'channel') ||
        getObject(channelResponse);

      const marketplaceData =
        marketplaceResponse?.creator_marketplace_auth ||
        getObject(marketplaceResponse);

      setSummary(dashboardData?.summary || null);
      setLatestVideos(dashboardData?.latest_videos || []);
      setTrend30Days(dashboardData?.trend_30_days || []);
      setAnalyticsOverview(analyticsData || null);
      setChannel(channelData || null);
      setMarketplaceAuth(marketplaceData || null);
      setExternalPosting(getObject(externalPostingResponse));
      setLoading(false);
    }

    loadDashboard();
  }, []);

  const isLight = theme === 'light';

  const channelName = getValue(channel, ['channel_name', 'name', 'title'], 'Creator');
  const channelHandle = getValue(channel, ['channel_handle', 'handle', 'username'], '');
  const channelSlug = getValue(channel, ['channel_slug', 'slug'], '');
  const hasChannel = !!(channel?.id || channel?.channel_name || channel?.name);

  const videoAnalytics = analyticsOverview?.totals?.video_analytics || {};
  const channelAnalytics = analyticsOverview?.totals?.channel_analytics || {};

  const stats = useMemo(() => {
    const totalVideos = getValue(summary, ['total_videos'], 0);
    const totalViews = getValue(summary, ['total_views', 'analytics_total_views'], 0);
    const subscribers =
      getValue(summary, ['total_subscribers'], 0) ||
      getValue(channel, ['subscriber_count', 'subscribers_count'], 0);
    const productClicks = getValue(summary, ['product_clicks', 'total_cta_clicks'], 0);
    const totalShares = getValue(summary, ['total_shares'], 0);

    return [
      { label: 'Total Videos', value: formatCompactNumber(totalVideos), sub: 'Creator uploads' },
      { label: 'Total Views', value: formatCompactNumber(totalViews), sub: 'Audience reach' },
      { label: 'Subscribers', value: formatCompactNumber(subscribers), sub: 'Channel community' },
      { label: 'Products Clicks', value: formatCompactNumber(productClicks), sub: 'Marketplace intent' },
      { label: 'Total Shares', value: formatCompactNumber(totalShares), sub: 'Share activity' },
    ];
  }, [summary, channel]);

  const recentVideos = useMemo(() => {
    return latestVideos.slice(0, 3).map((video, index) => ({
      id: video?.id || index + 1,
      title: video?.title || `Video ${index + 1}`,
      status: normalizeStatus(video?.status || video?.moderation_status),
      views: getValue(video, ['views_count', 'views', 'total_views'], 0),
      comments: getValue(video, ['comments_count', 'comments'], 0),
      date: formatDateLabel(video?.published_at || video?.created_at),
      thumbnail:
        video?.thumbnail_url ||
        video?.thumbnail ||
        video?.cover_image ||
        video?.image_url ||
        '',
    }));
  }, [latestVideos]);

  const chartItems = useMemo(() => {
    return trend30Days.map((item) => ({
      date: item?.analytics_date,
      value: Number(item?.[selectedMetric] || 0),
      raw: item,
    }));
  }, [trend30Days, selectedMetric]);

  const maxChartValue = useMemo(() => {
    if (!chartItems.length) return 0;
    return Math.max(...chartItems.map((item) => item.value), 0);
  }, [chartItems]);

  const weeklyEngagementText =
    videoAnalytics?.total_watch_time_seconds || channelAnalytics?.total_watch_time_seconds
      ? secondsToShortText(
          videoAnalytics?.total_watch_time_seconds || channelAnalytics?.total_watch_time_seconds
        )
      : '30 day activity trend';

  const marketplaceVerified =
    marketplaceAuth?.is_authenticated === 1 ||
    marketplaceAuth?.is_authenticated === true ||
    marketplaceAuth?.is_internal_supgad === 1 ||
    marketplaceAuth?.is_internal_supgad === true ||
    String(marketplaceAuth?.supgad_status || '').toLowerCase() === 'active';

  const externalPlanActive =
    externalPosting?.active === true ||
    externalPosting?.is_active === true ||
    String(externalPosting?.status || '').toLowerCase() === 'active';

  const currentPlanName =
    externalPosting?.plan_name ||
    externalPosting?.subscription?.plan_name ||
    'No active plan';

  const currentPlanUsage =
    Number(
      externalPosting?.videos_used_this_cycle ||
      externalPosting?.subscription?.videos_used_this_cycle ||
      0
    );

  const currentPlanLimit =
    Number(
      externalPosting?.video_limit_per_month ||
      externalPosting?.subscription?.video_limit_per_month ||
      0
    );

  const lastProductCheck =
    getValue(
      marketplaceAuth,
      ['verified_at', 'last_product_link_check', 'last_checked_at', 'checked_at', 'updated_at'],
      '—'
    );

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('videogad_token');
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }

  if (loading) {
    return (
      <div className={`videogad-dashboard-page ${isLight ? 'creator-dashboard-theme-light' : ''}`}>
        <main className="videogad-dashboard-main">
          <div className="videogad-panel">
            <h2>Loading creator dashboard...</h2>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`videogad-dashboard-page ${isLight ? 'creator-dashboard-theme-light' : ''}`}>
      <aside className={`videogad-dashboard-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="videogad-sidebar-top">
          <div className="videogad-brand">VideoGad</div>

          <button
            className="videogad-close-menu"
            onClick={() => setMenuOpen(false)}
            type="button"
          >
            ✕
          </button>
        </div>

        <nav className="videogad-dashboard-nav">
          <a href="/creator-dashboard" className="active">Dashboard</a>
          <a href="/create-channel">{hasChannel ? 'Edit Channel' : 'Create Channel'}</a>
          <a href="/upload-video">Upload Video</a>
          <a href="/my-videos">My Videos</a>
          <a href="/creator-analytics">Analytics</a>
          <a href="/creator-support">Support Chat</a>
          <a href="/creator-monetization">Monetization</a>
          <a href="/creator-ads">Ads</a>
          <a href="/creator-ads-analytics">Ads Analytics</a>
          <a href="/creator-wallet">Wallet</a>
          <a href="/creator-earnings">Earnings</a>
          <a href="/creator-payout">Payout</a>
          <a href="/creator-subscription">Subscription</a>
          <a href="/account-settings">Settings</a>

          {hasChannel ? (
            <div className="creator-channel-box">
              <p className="creator-channel-label">Your Channel</p>
              <h4>{channelName}</h4>
              <span>{channelHandle}</span>
              <small>{channelSlug}</small>
            </div>
          ) : null}

          <a href="/creator-marketplace-auth" className="creator-sidebar-auth-box">
            <p className="creator-channel-label">Authentication</p>
            <h4>Marketplace Auth</h4>
            <span>Click to authenticate Supgad store</span>
          </a>

          <button
            type="button"
            className="dashboard-logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </nav>
      </aside>

      <main className="videogad-dashboard-main">
        <header className="videogad-dashboard-header">
          <div className="videogad-mobile-topbar">
            <button
              className="videogad-menu-toggle"
              onClick={() => setMenuOpen(true)}
              type="button"
            >
              ☰
            </button>
            <div className="videogad-mobile-brand">VideoGad</div>
          </div>

          <div className="videogad-header-main">
            <div>
              <p className="eyebrow">Creator Studio</p>
              <h1>Welcome back, {channelName}</h1>
              <span>Manage your videos, audience and marketplace actions from one place.</span>
            </div>

            <div className="videogad-dashboard-header-actions">
              <button
                type="button"
                className="ghost-btn dashboard-theme-toggle-btn"
                onClick={() => setTheme(isLight ? 'dark' : 'light')}
              >
                {isLight ? 'Dark Mode' : 'Light Mode'}
              </button>
              <a href="/upload-video" className="primary-btn">Upload Video</a>
              <a href="/creator-support" className="ghost-btn">Support Chat</a>
              <a href="/creator-monetization" className="ghost-btn">Monetization</a>
              <a href="/creator-subscription" className="ghost-btn">Subscription</a>
              <a href="/creator-ads" className="ghost-btn">Manage Ads</a>
              <a href="/creator-ads-analytics" className="ghost-btn">Ads Analytics</a>
              <a href="/creator-wallet" className="ghost-btn">Wallet</a>
              <a href="/create-channel" className="ghost-btn">
                {hasChannel ? 'Edit Channel' : 'Create Channel'}
              </a>
            </div>
          </div>
        </header>

        <section className="videogad-stats-grid">
          {stats.map((item) => (
            <div className="videogad-stat-card" key={item.label}>
              <p>{item.label}</p>
              <h3>{item.value}</h3>
              <span>{item.sub}</span>
            </div>
          ))}
        </section>

        <section className="videogad-dashboard-content-grid">
          <div className="videogad-panel large">
            <div className="panel-head">
              <h2>Recent Videos</h2>
              <a href="/my-videos">See all</a>
            </div>

            <div className="videogad-video-table">
              {recentVideos.length ? (
                recentVideos.map((video) => (
                  <div className="videogad-video-row" key={video.id}>
                    <div className="video-main">
                      {video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="video-thumb-placeholder"
                        />
                      ) : (
                        <div className="video-thumb-placeholder">Thumbnail</div>
                      )}

                      <div>
                        <h4>{video.title}</h4>
                        <p>{video.date}</p>
                      </div>
                    </div>

                    <div className="video-meta">
                      <span className={`status-badge ${getStatusClass(video.status)}`}>
                        {video.status}
                      </span>
                      <span>{formatCompactNumber(video.views)} views</span>
                      <span>{formatCompactNumber(video.comments)} comments</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="dashboard-empty-box">No recent videos yet.</div>
              )}
            </div>
          </div>

          <div className="videogad-panel">
            <div className="panel-head">
              <h2>Quick Actions</h2>
            </div>

            <div className="quick-actions-list quick-actions-compact">
              <a href="/upload-video" className="quick-action-card quick-action-link">
                <h4>Upload Video</h4>
                <p>Add a new product video for viewers to watch and buy.</p>
              </a>

              <a href="/creator-support" className="quick-action-card quick-action-link">
                <h4>Support Chat</h4>
                <p>Chat with admin for help, questions and marketplace support.</p>
              </a>

              <a href="/creator-monetization" className="quick-action-card quick-action-link">
                <h4>Monetization</h4>
                <p>Check your eligibility and apply for monetization approval.</p>
              </a>

              <a href="/create-channel" className="quick-action-card quick-action-link">
                <h4>{hasChannel ? 'Edit Channel' : 'Create Channel'}</h4>
                <p>Set up your creator identity and storefront presence.</p>
              </a>

              <a href="/my-videos" className="quick-action-card quick-action-link">
                <h4>My Videos</h4>
                <p>Manage uploaded videos, edit details, and track status.</p>
              </a>

              <a href="/creator-ads" className="quick-action-card quick-action-link">
                <h4>Ads</h4>
                <p>Create ad campaigns and track ad performance.</p>
              </a>

              <a href="/creator-ads-analytics" className="quick-action-card quick-action-link">
                <h4>Ads Analytics</h4>
                <p>View real ad impressions, clicks and campaign performance.</p>
              </a>

              <a href="/creator-wallet" className="quick-action-card quick-action-link">
                <h4>Wallet</h4>
                <p>Top up your ad wallet and track every expenditure.</p>
              </a>

              <a href="/creator-subscription" className="quick-action-card quick-action-link">
                <h4>Subscription</h4>
                <p>Choose a plan for external links and monthly upload limit.</p>
              </a>

              <a href="/creator-marketplace-auth" className="quick-action-card quick-action-link">
                <h4>Marketplace Auth</h4>
                <p>Verify your Supgad store or manage external link access.</p>
              </a>
            </div>
          </div>
        </section>

        <section className="videogad-dashboard-content-grid lower">
          <div className="videogad-panel">
            <div className="panel-head">
              <h2>Performance Snapshot</h2>

              <select
                className="analytics-mini-select"
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
              >
                <option value="views_count">Views</option>
                <option value="product_clicks">Product Clicks</option>
                <option value="comments_count">Comments</option>
                <option value="shares_count">Shares</option>
              </select>
            </div>

            <div className="mini-chart-box modern">
              <div className="mini-chart-scroll">
                <div className="mini-chart-bars-30">
                  {chartItems.length ? (
                    chartItems.map((item, index) => {
                      const height =
                        maxChartValue > 0
                          ? `${Math.max((item.value / maxChartValue) * 100, 6)}%`
                          : '6%';

                      return (
                        <div className="mini-chart-day" key={`${item.date}-${index}`}>
                          <div
                            className="mini-chart-tooltip"
                            title={`${formatShortDay(item.date)} • ${formatCompactNumber(item.value)} ${selectedMetric.replace('_', ' ')}`}
                          >
                            <span className="mini-chart-tooltip-date">
                              {formatShortDay(item.date)}
                            </span>
                            <strong>{formatCompactNumber(item.value)}</strong>
                          </div>

                          <span
                            className="mini-chart-bar"
                            style={{ height }}
                            title={`${formatShortDay(item.date)} • ${formatCompactNumber(item.value)}`}
                          />

                          <small>{index % 5 === 0 ? formatShortDay(item.date) : ''}</small>
                        </div>
                      );
                    })
                  ) : (
                    <div className="dashboard-empty-box">No 30 day analytics yet.</div>
                  )}
                </div>
              </div>

              <p>{weeklyEngagementText}</p>
            </div>
          </div>

          <div className="videogad-panel">
            <div className="panel-head">
              <h2>Marketplace Status</h2>
            </div>

            <div className="marketplace-status-box">
              <div className="marketplace-row">
                <span>Supgad Store Auth</span>
                <strong className={marketplaceVerified ? 'good' : 'warn'}>
                  {marketplaceVerified ? 'Verified' : 'Not Verified'}
                </strong>
              </div>

              <div className="marketplace-row">
                <span>External Posting Plan</span>
                <strong className={externalPlanActive ? 'good' : 'warn'}>
                  {externalPlanActive ? 'Active' : 'Not Active'}
                </strong>
              </div>

              <div className="marketplace-row">
                <span>Current Plan</span>
                <strong>{currentPlanName}</strong>
              </div>

              <div className="marketplace-row">
                <span>Plan Usage</span>
                <strong>{currentPlanUsage}/{currentPlanLimit || 0}</strong>
              </div>

              <div className="marketplace-row">
                <span>Last Product Link Check</span>
                <strong>{formatDateLabel(lastProductCheck)}</strong>
              </div>

              <a href="/creator-marketplace-auth" className="text-link">
                Manage marketplace access
              </a>
              <a href="/creator-subscription" className="text-link dashboard-marketplace-link">
                Manage subscription
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default CreatorDashboardPage;