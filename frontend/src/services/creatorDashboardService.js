import React, { useEffect, useMemo, useState } from 'react';
import {
  getCreatorDashboardSummary,
  getCurrentExternalPostingSubscription,
  getMarketplaceAuthStatus,
  getMyChannel,
} from '../services/creatorDashboardService';

function normalizeArrayResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.videos)) return data.videos;
  if (Array.isArray(data?.recentVideos)) return data.recentVideos;
  if (Array.isArray(data?.recent_videos)) return data.recent_videos;
  return [];
}

function getDemoDashboardData() {
  return {
    summary: {
      totalVideos: 24,
      totalViews: '18.4K',
      subscribers: '2,148',
      productClicks: '942',
      weeklyEngagementText: 'Weekly engagement trend',
      recentVideos: [
        {
          id: 1,
          title: 'Best Wireless Earbuds Under $50',
          status: 'Published',
          views: '3.4K',
          comments: 42,
          date: '2 days ago',
        },
        {
          id: 2,
          title: 'Top 5 Budget Smart Watches',
          status: 'Pending Review',
          views: '1.1K',
          comments: 13,
          date: '5 days ago',
        },
        {
          id: 3,
          title: 'Amazon Finds You Will Actually Use',
          status: 'Draft',
          views: '—',
          comments: 0,
          date: 'Not published',
        },
      ],
    },
    channel: {
      id: 777,
      name: 'Demo Creator Channel',
      channel_name: 'Demo Creator Channel',
      slug: 'demo-channel',
    },
    marketplaceAuth: {
      verified: true,
      status: 'verified',
    },
    externalPosting: {
      active: false,
      status: 'inactive',
    },
    isDemo: true,
  };
}

function CreatorDashboardPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [myChannel, setMyChannel] = useState(null);
  const [marketplaceAuth, setMarketplaceAuth] = useState(null);
  const [externalPosting, setExternalPosting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setErrorMessage('');
      setPageMessage('');

      try {
        const [summaryResponse, channelResponse, marketplaceResponse, postingResponse] =
          await Promise.all([
            getCreatorDashboardSummary().catch(() => null),
            getMyChannel().catch(() => null),
            getMarketplaceAuthStatus().catch(() => null),
            getCurrentExternalPostingSubscription().catch(() => null),
          ]);

        if (!summaryResponse && !channelResponse && !marketplaceResponse && !postingResponse) {
          throw new Error('Dashboard data not available');
        }

        setDashboardSummary(summaryResponse);
        setMyChannel(channelResponse);
        setMarketplaceAuth(marketplaceResponse);
        setExternalPosting(postingResponse);
        setIsDemoMode(false);
      } catch (error) {
        const demo = getDemoDashboardData();
        setDashboardSummary(demo.summary);
        setMyChannel(demo.channel);
        setMarketplaceAuth(demo.marketplaceAuth);
        setExternalPosting(demo.externalPosting);
        setIsDemoMode(true);
        setPageMessage('Demo mode is showing because full dashboard data is not available yet.');
        setErrorMessage('');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const recentVideos = useMemo(() => {
    return (
      normalizeArrayResponse(dashboardSummary?.recentVideos).length
        ? normalizeArrayResponse(dashboardSummary?.recentVideos)
        : normalizeArrayResponse(dashboardSummary?.recent_videos).length
        ? normalizeArrayResponse(dashboardSummary?.recent_videos)
        : normalizeArrayResponse(dashboardSummary?.videos).length
        ? normalizeArrayResponse(dashboardSummary?.videos)
        : normalizeArrayResponse(dashboardSummary)
    );
  }, [dashboardSummary]);

  const stats = useMemo(() => {
    return [
      {
        label: 'Total Videos',
        value:
          dashboardSummary?.totalVideos ||
          dashboardSummary?.total_videos ||
          dashboardSummary?.videoCount ||
          dashboardSummary?.video_count ||
          0,
        sub: 'Creator uploads',
      },
      {
        label: 'Total Views',
        value:
          dashboardSummary?.totalViews ||
          dashboardSummary?.total_views ||
          dashboardSummary?.views ||
          0,
        sub: 'Audience reach',
      },
      {
        label: 'Subscribers',
        value:
          dashboardSummary?.subscribers ||
          dashboardSummary?.subscriber_count ||
          myChannel?.subscribers_count ||
          0,
        sub: 'Channel community',
      },
      {
        label: 'Products Clicks',
        value:
          dashboardSummary?.productClicks ||
          dashboardSummary?.product_clicks ||
          dashboardSummary?.clicks ||
          0,
        sub: 'Marketplace intent',
      },
    ];
  }, [dashboardSummary, myChannel]);

  const channelName =
    myChannel?.name ||
    myChannel?.channel_name ||
    myChannel?.title ||
    'Creator';

  const marketplaceVerified =
    marketplaceAuth?.verified === true ||
    marketplaceAuth?.is_verified === true ||
    marketplaceAuth?.status === 'verified';

  const externalPlanActive =
    externalPosting?.active === true ||
    externalPosting?.is_active === true ||
    externalPosting?.status === 'active';

  if (loading) {
    return (
      <div className="dashboard-loading-page">
        <div className="dashboard-loading-card">Loading creator dashboard...</div>
      </div>
    );
  }

  return (
    <div className="videogad-dashboard-page">
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
          <a href="/create-channel">Create Channel</a>
          <a href="/upload-video">Upload Video</a>
          <a href="/my-videos">My Videos</a>
          <a href="/creator-analytics">Analytics</a>
          <a href="/creator-earnings">Earnings</a>
          <a href="/creator-payout">Payout</a>
          <a href="/account-settings">Settings</a>
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

          {errorMessage ? (
            <div className="dashboard-inline-message error">{errorMessage}</div>
          ) : null}

          {pageMessage ? (
            <div className="dashboard-inline-message success">{pageMessage}</div>
          ) : null}

          <div className="videogad-header-main">
            <div>
              <p className="eyebrow">Creator Studio</p>
              <h1>Welcome back, {channelName}</h1>
              <span>
                Manage your videos, audience and marketplace actions from one place.
              </span>
            </div>

            <div className="videogad-dashboard-header-actions">
              <a href="/upload-video" className="primary-btn">Upload Video</a>
              <a href="/create-channel" className="ghost-btn">Create Channel</a>
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
                recentVideos.map((video, index) => (
                  <div className="videogad-video-row" key={video?.id || index}>
                    <div className="video-main">
                      <div className="video-thumb-placeholder">Thumbnail</div>
                      <div>
                        <h4>{video?.title || `Recent Video ${index + 1}`}</h4>
                        <p>{video?.date || video?.created_at || 'Recently added'}</p>
                      </div>
                    </div>

                    <div className="video-meta">
                      <span
                        className={`status-badge ${String(video?.status || 'draft')
                          .toLowerCase()
                          .replace(/\s+/g, '-')}`}
                      >
                        {video?.status || 'Draft'}
                      </span>
                      <span>{video?.views || video?.views_count || 0} views</span>
                      <span>{video?.comments || video?.comments_count || 0} comments</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="dashboard-empty-box">No recent videos returned yet.</div>
              )}
            </div>
          </div>

          <div className="videogad-panel">
            <div className="panel-head">
              <h2>Quick Actions</h2>
            </div>

            <div className="quick-actions-list">
              <div className="quick-action-card">
                <h4>Upload Video</h4>
                <p>Add a new product video for viewers to watch and buy.</p>
              </div>

              <div className="quick-action-card">
                <h4>Create Channel</h4>
                <p>Set up or update your creator identity and storefront presence.</p>
              </div>

              <div className="quick-action-card">
                <h4>My Videos</h4>
                <p>Manage uploaded videos, edit details, and track status.</p>
              </div>

              <div className="quick-action-card">
                <h4>Marketplace Auth</h4>
                <p>Verify your store or manage external posting access.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="videogad-dashboard-content-grid lower">
          <div className="videogad-panel">
            <div className="panel-head">
              <h2>Performance Snapshot</h2>
            </div>

            <div className="mini-chart-box">
              <div className="fake-bars">
                <span style={{ height: '45%' }}></span>
                <span style={{ height: '65%' }}></span>
                <span style={{ height: '55%' }}></span>
                <span style={{ height: '82%' }}></span>
                <span style={{ height: '70%' }}></span>
                <span style={{ height: '94%' }}></span>
                <span style={{ height: '76%' }}></span>
              </div>
              <p>
                {dashboardSummary?.weeklyEngagementText ||
                  dashboardSummary?.engagement_text ||
                  'Weekly engagement trend'}
              </p>
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
                <span>Creator Channel</span>
                <strong>{channelName}</strong>
              </div>

              <a href="/creator-marketplace-auth" className="text-link">
                Manage marketplace access
              </a>
            </div>
          </div>
        </section>

        {isDemoMode ? (
          <div className="dashboard-bottom-note">
            Some dashboard blocks are in demo mode because backend summary fields are not fully available yet.
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default CreatorDashboardPage;