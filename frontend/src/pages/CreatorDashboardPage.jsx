import React, { useEffect, useState } from 'react';
import { getMyChannel } from '../services/createChannelService';

const stats = [
  { label: 'Total Videos', value: '24', sub: '+3 this week' },
  { label: 'Total Views', value: '18.4K', sub: '+1.2K this week' },
  { label: 'Subscribers', value: '2,148', sub: '+86 this month' },
  { label: 'Products Clicks', value: '942', sub: '+74 this week' },
];

const recentVideos = [
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
];

const quickActions = [
  { title: 'Upload Video', desc: 'Add a new product video for viewers to watch and buy.' },
  { title: 'Create Channel', desc: 'Set up your creator identity and storefront presence.' },
  { title: 'My Videos', desc: 'Manage uploaded videos, edit details, and track status.' },
  { title: 'Marketplace Auth', desc: 'Verify your Supgad store or manage external link access.' },
];

function CreatorDashboardPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [channel, setChannel] = useState(null);

  useEffect(() => {
    async function loadMyChannel() {
      try {
        const response = await getMyChannel();
        const channelData = response?.channel || response?.data || response;

        if (channelData && (channelData.id || channelData.channel_name || channelData.name)) {
          setChannel(channelData);
        } else {
          setChannel(null);
        }
      } catch (error) {
        setChannel(null);
      }
    }

    loadMyChannel();
  }, []);

  const channelName = channel?.channel_name || channel?.name || '';
  const channelHandle = channel?.channel_handle || channel?.handle || '';
  const channelSlug = channel?.channel_slug || channel?.slug || '';
  const hasChannel = !!channel;

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
          <a href="/create-channel">{hasChannel ? 'Edit Channel' : 'Create Channel'}</a>
          <a href="/upload-video">Upload Video</a>
          <a href="/my-videos">My Videos</a>
          <a href="/creator-analytics">Analytics</a>
          <a href="/creator-earnings">Earnings</a>
          <a href="/creator-payout">Payout</a>
          <a href="/account-settings">Settings</a>

          {hasChannel ? (
            <div className="creator-channel-box">
              <p className="creator-channel-label">Your Channel</p>
              <h4>{channelName}</h4>
              <span>{channelHandle}</span>
              <small>{channelSlug}</small>
            </div>
          ) : null}
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
              <h1>Welcome back, Creator</h1>
              <span>Manage your videos, audience and marketplace actions from one place.</span>
            </div>

            <div className="videogad-dashboard-header-actions">
              <a href="/upload-video" className="primary-btn">Upload Video</a>
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
              {recentVideos.map((video) => (
                <div className="videogad-video-row" key={video.id}>
                  <div className="video-main">
                    <div className="video-thumb-placeholder">Thumbnail</div>
                    <div>
                      <h4>{video.title}</h4>
                      <p>{video.date}</p>
                    </div>
                  </div>

                  <div className="video-meta">
                    <span className={`status-badge ${video.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {video.status}
                    </span>
                    <span>{video.views} views</span>
                    <span>{video.comments} comments</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="videogad-panel">
            <div className="panel-head">
              <h2>Quick Actions</h2>
            </div>

            <div className="quick-actions-list">
              {quickActions.map((action) => (
                <div className="quick-action-card" key={action.title}>
                  <h4>{action.title}</h4>
                  <p>{action.desc}</p>
                </div>
              ))}
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
              <p>Weekly engagement trend</p>
            </div>
          </div>

          <div className="videogad-panel">
            <div className="panel-head">
              <h2>Marketplace Status</h2>
            </div>

            <div className="marketplace-status-box">
              <div className="marketplace-row">
                <span>Supgad Store Auth</span>
                <strong className="good">Verified</strong>
              </div>
              <div className="marketplace-row">
                <span>External Posting Plan</span>
                <strong className="warn">Not Active</strong>
              </div>
              <div className="marketplace-row">
                <span>Last Product Link Check</span>
                <strong>Today</strong>
              </div>
              <a href="/creator-marketplace-auth" className="text-link">
                Manage marketplace access
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default CreatorDashboardPage;