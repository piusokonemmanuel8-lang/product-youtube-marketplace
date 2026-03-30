import React, { useEffect, useMemo, useState } from 'react';
import '../creator-dashboard.css';
import creatorAdsService from '../services/creatorAdsService';
import {
  getCreatorDashboardSummary,
  getMyChannel,
} from '../services/creatorDashboardService';

function getValue(obj, keys = [], fallback = '') {
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

  if (!Number.isFinite(number)) return '0';
  if (number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}K`;

  return number.toLocaleString();
}

function formatMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0.00';
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function normalizeStatus(value) {
  const raw = String(value || '').trim().toLowerCase();

  if (!raw) return 'Draft';
  if (raw === 'active') return 'Active';
  if (raw === 'paused') return 'Paused';
  if (raw === 'approved') return 'Approved';
  if (raw === 'pending') return 'Pending';
  if (raw === 'rejected') return 'Rejected';
  if (raw === 'draft') return 'Draft';

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusClass(value) {
  return String(value || 'draft').toLowerCase().replace(/\s+/g, '-');
}

function isBlockedVideo(video) {
  const rawKey = String(video?.video_key || '').trim();
  if (!rawKey) return true;
  if (/\/watch\//i.test(rawKey)) return true;
  return false;
}

function getVideoViews(video) {
  const directValue = getValue(
    video,
    [
      'views_count',
      'views',
      'total_views',
      'view_count',
      'totalViews',
      'viewsCount',
      'video_views',
      'watch_views',
    ],
    null
  );

  if (directValue !== null) {
    return Number(directValue || 0);
  }

  const metricsValue = getValue(
    video?.metrics || {},
    [
      'total_views',
      'views_count',
      'views',
      'view_count',
    ],
    0
  );

  return Number(metricsValue || 0);
}

function CreatorAdsPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [channel, setChannel] = useState(null);
  const [summary, setSummary] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingCampaign, setSubmittingCampaign] = useState(false);
  const [submittingAdVideo, setSubmittingAdVideo] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [campaignResponse, setCampaignResponse] = useState(null);
  const [adVideoResponse, setAdVideoResponse] = useState(null);
  const [campaignStats, setCampaignStats] = useState(null);

  const [campaignForm, setCampaignForm] = useState({
    video_id: '',
    advertiser_name: '',
    title: '',
    description: '',
    destination_url: '',
    duration_days: '7',
    budget: '',
    daily_budget: '',
    payment_reference: '',
    payment_note: '',
    start_date: '',
    end_date: '',
    objective: 'views',
    skip_after_seconds: '10',
  });

  const [adVideoForm, setAdVideoForm] = useState({
    campaign_id: '',
    video_id: '',
    ad_video_title: '',
    ad_video_description: '',
    ad_duration_seconds: '60',
  });

  const [statsCampaignId, setStatsCampaignId] = useState('');

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setError('');

      try {
        const [channelResponse, dashboardResponse, videosResponse] = await Promise.all([
          getMyChannel().catch(() => null),
          getCreatorDashboardSummary().catch(() => null),
          creatorAdsService.getMyVideos().catch(() => []),
        ]);

        const channelData = channelResponse?.channel || channelResponse || null;
        const dashboardData = dashboardResponse?.data || dashboardResponse || null;

        setChannel(channelData);
        setSummary(dashboardData?.summary || null);
        setVideos(Array.isArray(videosResponse) ? videosResponse : []);
      } catch (err) {
        setError(err.message || 'Failed to load ads page');
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, []);

  const colors = useMemo(() => {
    if (theme === 'light') {
      return {
        pageBg: '#f5f7fb',
        panelBg: '#ffffff',
        panelBorder: '#d9e2f1',
        text: '#0f172a',
        subtext: '#475569',
        inputBg: '#ffffff',
        inputBorder: '#cbd5e1',
        cardBg: '#ffffff',
        sidebarBg: '#0f172a',
        sidebarText: '#ffffff',
        noteBg: '#f8fafc',
        noteBorder: '#dbeafe',
      };
    }

    return {
      pageBg: '#050816',
      panelBg: '#0b1328',
      panelBorder: '#1e2a4a',
      text: '#ffffff',
      subtext: '#cbd5e1',
      inputBg: '#091224',
      inputBorder: '#1e2a4a',
      cardBg: '#101a33',
      sidebarBg: '',
      sidebarText: '',
      noteBg: '#0b1328',
      noteBorder: '#1e2a4a',
    };
  }, [theme]);

  const headingStyle = {
    color: '#ffffff',
    fontWeight: 800,
    fontSize: 28,
  };

  const panelTitleStyle = {
    color: theme === 'light' ? '#0f172a' : '#ffffff',
    fontWeight: 700,
    fontSize: 24,
    margin: 0,
  };

  const sectionHeaderStyle = {
    color: theme === 'light' ? '#0f172a' : '#ffffff',
    fontWeight: 700,
    fontSize: 24,
    margin: 0,
  };

  const panelStyle = {
    background: colors.panelBg,
    border: `1px solid ${colors.panelBorder}`,
    color: colors.text,
  };

  const inputStyle = {
    background: colors.inputBg,
    border: `1px solid ${colors.inputBorder}`,
    color: colors.text,
  };

  const noteStyle = {
    background: colors.noteBg,
    border: `1px solid ${colors.noteBorder}`,
    color: colors.text,
    padding: 12,
    marginTop: 4,
  };

  const statCardStyle = {
    background: colors.cardBg,
    border: `1px solid ${colors.panelBorder}`,
    color: colors.text,
  };

  const marketplaceBoxStyle = {
    background: colors.panelBg,
    border: `1px solid ${colors.panelBorder}`,
    color: colors.text,
    borderRadius: 12,
    padding: 14,
  };

  const channelName = getValue(channel, ['channel_name', 'name', 'title'], 'Creator');
  const channelHandle = getValue(channel, ['channel_handle', 'handle'], '');
  const channelSlug = getValue(channel, ['channel_slug', 'slug'], '');
  const hasChannel = !!(channel?.id || channel?.channel_name || channel?.name);

  const usableVideos = useMemo(() => {
    return videos
      .map((video, index) => ({
        id: video?.id || index + 1,
        title: video?.title || `Video ${index + 1}`,
        status: video?.status || video?.moderation_status || 'unknown',
        views: getVideoViews(video),
        duration_seconds: Number(video?.duration_seconds || 0),
        thumbnail:
          video?.thumbnail_url ||
          video?.thumbnail ||
          video?.cover_image ||
          '',
        video_key: video?.video_key || '',
        blocked: isBlockedVideo(video),
      }))
      .filter((video) => !video.blocked);
  }, [videos]);

  useEffect(() => {
    if (!campaignForm.video_id && usableVideos.length) {
      setCampaignForm((prev) => ({
        ...prev,
        video_id: String(usableVideos[0].id),
      }));
    }

    if (!adVideoForm.video_id && usableVideos.length) {
      setAdVideoForm((prev) => ({
        ...prev,
        video_id: String(usableVideos[0].id),
        ad_video_title: prev.ad_video_title || usableVideos[0].title,
        ad_duration_seconds: '60',
      }));
    }
  }, [usableVideos, campaignForm.video_id, adVideoForm.video_id, adVideoForm.ad_video_title]);

  function handleCampaignChange(event) {
    const { name, value } = event.target;
    setCampaignForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleAdVideoChange(event) {
    const { name, value } = event.target;
    setAdVideoForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleUseVideo(video) {
    setCampaignForm((prev) => ({
      ...prev,
      video_id: String(video.id),
    }));

    setAdVideoForm((prev) => ({
      ...prev,
      video_id: String(video.id),
      ad_video_title: prev.ad_video_title || video.title,
      ad_duration_seconds: '60',
    }));
  }

  async function handleCreateCampaign(event) {
    event.preventDefault();
    setSubmittingCampaign(true);
    setMessage('');
    setError('');
    setCampaignResponse(null);

    try {
      const response = await creatorAdsService.createAdCampaign(campaignForm);
      setCampaignResponse(response);
      setMessage('Ad campaign submitted successfully. Waiting for admin approval.');

      const newCampaignId =
        response?.campaign?.id ||
        response?.id ||
        response?.campaign_id ||
        '';

      if (newCampaignId) {
        setAdVideoForm((prev) => ({
          ...prev,
          campaign_id: String(newCampaignId),
          video_id: prev.video_id || campaignForm.video_id,
        }));
        setStatsCampaignId(String(newCampaignId));
      }
    } catch (err) {
      setError(err.message || 'Failed to create ad campaign');
    } finally {
      setSubmittingCampaign(false);
    }
  }

  async function handleCreateAdVideo(event) {
    event.preventDefault();
    setSubmittingAdVideo(true);
    setMessage('');
    setError('');
    setAdVideoResponse(null);

    try {
      const response = await creatorAdsService.createAdVideo({
        ...adVideoForm,
        ad_duration_seconds: '60',
      });

      setAdVideoResponse(response);
      setMessage('Ad video submitted successfully. Waiting for admin approval.');
    } catch (err) {
      setError(err.message || 'Failed to create ad video');
    } finally {
      setSubmittingAdVideo(false);
    }
  }

  async function handleLoadStats() {
    if (!statsCampaignId) {
      setError('Enter a campaign ID first');
      return;
    }

    setLoadingStats(true);
    setMessage('');
    setError('');

    try {
      const stats = await creatorAdsService.getCampaignStats(statsCampaignId);
      setCampaignStats(stats);
      setMessage('Campaign performance loaded');
    } catch (err) {
      setCampaignStats(null);
      setError(err.message || 'Failed to load campaign performance');
    } finally {
      setLoadingStats(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('videogad_token');
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }

  const latestCampaign = campaignResponse?.campaign || null;
  const latestPricing = campaignResponse?.pricing || null;
  const latestAdVideo =
    adVideoResponse?.ad_video ||
    adVideoResponse?.video ||
    adVideoResponse?.data ||
    adVideoResponse ||
    null;

  const statsData = campaignStats?.stats || campaignStats || {};
  const statsCampaign = campaignStats?.campaign || null;

  if (loading) {
    return (
      <div className="videogad-dashboard-page" style={{ background: colors.pageBg, minHeight: '100vh' }}>
        <main className="videogad-dashboard-main">
          <div className="videogad-panel" style={panelStyle}>
            <h2 style={panelTitleStyle}>Loading ads page...</h2>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="videogad-dashboard-page" style={{ background: colors.pageBg, minHeight: '100vh', color: colors.text }}>
      <aside
        className={`videogad-dashboard-sidebar ${menuOpen ? 'open' : ''}`}
        style={theme === 'light' ? { background: colors.sidebarBg, color: colors.sidebarText } : undefined}
      >
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
          <a href="/creator-dashboard">Dashboard</a>
          <a href="/create-channel">{hasChannel ? 'Edit Channel' : 'Create Channel'}</a>
          <a href="/upload-video">Upload Video</a>
          <a href="/my-videos">My Videos</a>
          <a href="/creator-analytics">Analytics</a>
          <a href="/creator-ads" className="active">Ads</a>
          <a href="/creator-ads-analytics">Ads Analytics</a>
          <a href="/creator-wallet">Wallet</a>
          <a href="/creator-earnings">Earnings</a>
          <a href="/creator-payout">Payout</a>
          <a href="/creator-marketplace-auth">Marketplace Auth</a>

          {hasChannel ? (
            <div className="creator-channel-box">
              <p className="creator-channel-label">Your Channel</p>
              <h4>{channelName}</h4>
              <span>{channelHandle}</span>
              <small>{channelSlug}</small>
            </div>
          ) : null}

          <button
            type="button"
            className="dashboard-logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </nav>
      </aside>

      <main className="videogad-dashboard-main" style={{ color: colors.text }}>
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
              <p className="eyebrow" style={{ color: theme === 'light' ? '#475569' : '#cbd5e1' }}>Creator Ads</p>
              <h1 style={headingStyle}>Create and track your ads</h1>
              <span style={{ color: theme === 'light' ? '#475569' : '#cbd5e1' }}>
                Select a channel video and submit your campaign.
              </span>
            </div>

            <div className="videogad-dashboard-header-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              >
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </div>
        </header>

        {error ? (
          <div className="videogad-panel" style={{ ...panelStyle, border: '1px solid #5c1f24' }}>
            <strong>{error}</strong>
          </div>
        ) : null}

        {message ? (
          <div className="videogad-panel" style={{ ...panelStyle, border: '1px solid #1d4d34' }}>
            <strong>{message}</strong>
          </div>
        ) : null}

        <div className="videogad-panel" style={{ ...panelStyle, marginBottom: 16 }}>
          <strong>Usable videos for ads: {usableVideos.length}</strong>
          <div style={{ marginTop: 8, opacity: 0.9, color: colors.subtext }}>
            Only obvious broken watch-page links are hidden here. Backend will do the final validation.
          </div>
        </div>

        <section className="videogad-stats-grid">
          <div className="videogad-stat-card" style={statCardStyle}>
            <p style={{ color: colors.subtext }}>Total Videos</p>
            <h3 style={{ color: colors.text }}>{formatCompactNumber(summary?.total_videos || usableVideos.length)}</h3>
            <span style={{ color: colors.subtext }}>Available for promotion</span>
          </div>

          <div className="videogad-stat-card" style={statCardStyle}>
            <p style={{ color: colors.subtext }}>Total Views</p>
            <h3 style={{ color: colors.text }}>{formatCompactNumber(summary?.total_views || 0)}</h3>
            <span style={{ color: colors.subtext }}>Audience reach</span>
          </div>

          <div className="videogad-stat-card" style={statCardStyle}>
            <p style={{ color: colors.subtext }}>Product Clicks</p>
            <h3 style={{ color: colors.text }}>{formatCompactNumber(summary?.product_clicks || 0)}</h3>
            <span style={{ color: colors.subtext }}>Commercial interest</span>
          </div>

          <div className="videogad-stat-card" style={statCardStyle}>
            <p style={{ color: colors.subtext }}>Campaign Stats Lookup</p>
            <h3 style={{ color: colors.text }}>{campaignStats ? 'Ready' : '—'}</h3>
            <span style={{ color: colors.subtext }}>Use campaign ID to load performance</span>
          </div>
        </section>

        <section className="videogad-dashboard-content-grid">
          <div className="videogad-panel large" style={panelStyle}>
            <div className="panel-head">
              <h2 style={sectionHeaderStyle}>Create Ad Campaign</h2>
            </div>

            <form className="admin-form" onSubmit={handleCreateCampaign}>
              <select
                className="admin-input"
                style={inputStyle}
                name="video_id"
                value={campaignForm.video_id}
                onChange={handleCampaignChange}
                required
              >
                <option value="">Select video to promote</option>
                {usableVideos.map((video) => (
                  <option key={video.id} value={video.id}>
                    {video.title} • {formatCompactNumber(video.views)} views
                  </option>
                ))}
              </select>

              <input
                className="admin-input"
                style={inputStyle}
                name="advertiser_name"
                placeholder="Advertiser name"
                value={campaignForm.advertiser_name}
                onChange={handleCampaignChange}
                required
              />

              <input
                className="admin-input"
                style={inputStyle}
                name="title"
                placeholder="Campaign title"
                value={campaignForm.title}
                onChange={handleCampaignChange}
                required
              />

              <textarea
                className="admin-input admin-textarea"
                style={inputStyle}
                name="description"
                placeholder="Campaign description"
                value={campaignForm.description}
                onChange={handleCampaignChange}
              />

              <input
                className="admin-input"
                style={inputStyle}
                name="destination_url"
                placeholder="Destination URL"
                value={campaignForm.destination_url}
                onChange={handleCampaignChange}
                required
              />

              <select
                className="admin-input"
                style={inputStyle}
                name="objective"
                value={campaignForm.objective}
                onChange={handleCampaignChange}
              >
                <option value="views">Views</option>
                <option value="clicks">Clicks</option>
                <option value="awareness">Awareness</option>
              </select>

              <div className="admin-panels-grid">
                <input
                  className="admin-input"
                  style={inputStyle}
                  name="duration_days"
                  placeholder="Duration days"
                  type="number"
                  min="1"
                  value={campaignForm.duration_days}
                  onChange={handleCampaignChange}
                  required
                />

                <input
                  className="admin-input"
                  style={inputStyle}
                  name="budget"
                  placeholder="Total budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={campaignForm.budget}
                  onChange={handleCampaignChange}
                  required
                />
              </div>

              <div className="admin-panels-grid">
                <input
                  className="admin-input"
                  style={inputStyle}
                  name="daily_budget"
                  placeholder="Daily budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={campaignForm.daily_budget}
                  onChange={handleCampaignChange}
                />

                <input
                  className="admin-input"
                  style={inputStyle}
                  name="payment_reference"
                  placeholder="Payment reference"
                  value={campaignForm.payment_reference}
                  onChange={handleCampaignChange}
                />
              </div>

              <div className="admin-panels-grid">
                <input
                  className="admin-input"
                  style={inputStyle}
                  name="start_date"
                  type="date"
                  value={campaignForm.start_date}
                  onChange={handleCampaignChange}
                />

                <input
                  className="admin-input"
                  style={inputStyle}
                  name="end_date"
                  type="date"
                  value={campaignForm.end_date}
                  onChange={handleCampaignChange}
                />
              </div>

              <input
                className="admin-input"
                style={inputStyle}
                name="skip_after_seconds"
                placeholder="Skip button after seconds"
                type="number"
                min="3"
                value={campaignForm.skip_after_seconds}
                onChange={handleCampaignChange}
                required
              />

              <textarea
                className="admin-input admin-textarea"
                style={inputStyle}
                name="payment_note"
                placeholder="Payment note"
                value={campaignForm.payment_note}
                onChange={handleCampaignChange}
              />

              <div className="videogad-panel" style={noteStyle}>
                <strong>Note:</strong> Minimum skip time is 3 seconds. The ad keeps playing until the viewer clicks Skip.
              </div>

              <div className="admin-actions">
                <button
                  className="admin-btn success"
                  type="submit"
                  disabled={submittingCampaign || !usableVideos.length}
                >
                  {submittingCampaign ? 'Submitting...' : 'Submit Campaign'}
                </button>
              </div>
            </form>
          </div>

          <div className="videogad-panel" style={panelStyle}>
            <div className="panel-head">
              <h2 style={sectionHeaderStyle}>Video List</h2>
            </div>

            <div className="videogad-video-table">
              {usableVideos.length ? (
                usableVideos.slice(0, 8).map((video) => (
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
                        <h4 style={{ color: colors.text }}>{video.title}</h4>
                        <p style={{ color: colors.subtext }}>Status: {video.status}</p>
                      </div>
                    </div>

                    <div className="video-meta">
                      <span style={{ color: colors.text }}>{formatCompactNumber(video.views)} views</span>
                      <button
                        className="admin-btn secondary"
                        type="button"
                        onClick={() => handleUseVideo(video)}
                      >
                        Use Video
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="dashboard-empty-box">
                  No usable channel video found yet.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="videogad-dashboard-content-grid lower">
          <div className="videogad-panel" style={panelStyle}>
            <div className="panel-head">
              <h2 style={sectionHeaderStyle}>Create Ad Video</h2>
            </div>

            <form className="admin-form" onSubmit={handleCreateAdVideo}>
              <input
                className="admin-input"
                style={inputStyle}
                name="campaign_id"
                placeholder="Campaign ID"
                value={adVideoForm.campaign_id}
                onChange={handleAdVideoChange}
              />

              <select
                className="admin-input"
                style={inputStyle}
                name="video_id"
                value={adVideoForm.video_id}
                onChange={handleAdVideoChange}
                required
              >
                <option value="">Select linked creator video</option>
                {usableVideos.map((video) => (
                  <option key={video.id} value={video.id}>
                    {video.title}
                  </option>
                ))}
              </select>

              <input
                className="admin-input"
                style={inputStyle}
                name="ad_video_title"
                placeholder="Ad video title"
                value={adVideoForm.ad_video_title}
                onChange={handleAdVideoChange}
                required
              />

              <textarea
                className="admin-input admin-textarea"
                style={inputStyle}
                name="ad_video_description"
                placeholder="Ad video description"
                value={adVideoForm.ad_video_description}
                onChange={handleAdVideoChange}
              />

              <input
                className="admin-input"
                style={inputStyle}
                name="ad_duration_seconds"
                placeholder="Ad duration in seconds"
                type="number"
                min="1"
                value="60"
                readOnly
              />

              <div className="videogad-panel" style={noteStyle}>
                <strong>Note:</strong> Ad duration is fixed to 60 seconds.
              </div>

              <div className="admin-actions">
                <button
                  className="admin-btn success"
                  type="submit"
                  disabled={submittingAdVideo || !usableVideos.length}
                >
                  {submittingAdVideo ? 'Submitting...' : 'Submit Ad Video'}
                </button>
              </div>
            </form>
          </div>

          <div className="videogad-panel" style={panelStyle}>
            <div className="panel-head">
              <h2 style={sectionHeaderStyle}>Campaign Performance</h2>
            </div>

            <div className="admin-form">
              <input
                className="admin-input"
                style={inputStyle}
                placeholder="Campaign ID"
                value={statsCampaignId}
                onChange={(e) => setStatsCampaignId(e.target.value)}
              />

              <div className="admin-actions">
                <button
                  className="admin-btn secondary"
                  type="button"
                  disabled={loadingStats}
                  onClick={handleLoadStats}
                >
                  {loadingStats ? 'Loading...' : 'Load Performance'}
                </button>
              </div>
            </div>

            <div className="admin-panels-grid" style={{ marginTop: 16 }}>
              <div className="admin-card" style={statCardStyle}>
                <p className="admin-card-label" style={{ color: colors.subtext }}>Impressions</p>
                <h3 className="admin-card-value" style={{ color: colors.text }}>
                  {formatCompactNumber(
                    statsData?.impressions ||
                      statsData?.total_impressions ||
                      0
                  )}
                </h3>
              </div>

              <div className="admin-card" style={statCardStyle}>
                <p className="admin-card-label" style={{ color: colors.subtext }}>Clicks</p>
                <h3 className="admin-card-value" style={{ color: colors.text }}>
                  {formatCompactNumber(
                    statsData?.clicks ||
                      statsData?.total_clicks ||
                      0
                  )}
                </h3>
              </div>

              <div className="admin-card" style={statCardStyle}>
                <p className="admin-card-label" style={{ color: colors.subtext }}>Skips</p>
                <h3 className="admin-card-value" style={{ color: colors.text }}>
                  {formatCompactNumber(
                    statsData?.skips ||
                      statsData?.total_skips ||
                      0
                  )}
                </h3>
              </div>

              <div className="admin-card" style={statCardStyle}>
                <p className="admin-card-label" style={{ color: colors.subtext }}>Budget</p>
                <h3 className="admin-card-value" style={{ color: colors.text }}>
                  ${formatMoney(
                    statsCampaign?.budget ||
                      statsData?.budget ||
                      statsData?.budget_amount ||
                      statsData?.total_budget ||
                      0
                  )}
                </h3>
              </div>
            </div>

            {statsCampaign ? (
              <div className="videogad-video-table" style={{ marginTop: 16 }}>
                <div className="videogad-video-row">
                  <div className="video-main">
                    <div className="video-thumb-placeholder">ID</div>
                    <div>
                      <h4 style={{ color: colors.text }}>{statsCampaign.title || 'Campaign'}</h4>
                      <p style={{ color: colors.subtext }}>{statsCampaign.advertiser_name || 'Advertiser'}</p>
                    </div>
                  </div>

                  <div className="video-meta">
                    <span className={`status-badge ${getStatusClass(statsCampaign.status)}`}>
                      {normalizeStatus(statsCampaign.status)}
                    </span>
                    <span style={{ color: colors.text }}>Campaign ID: {statsCampaign.id || '—'}</span>
                  </div>
                </div>

                <div style={{ ...marketplaceBoxStyle, marginTop: 16 }}>
                  <div className="marketplace-row">
                    <span>Destination URL</span>
                    <strong style={{ wordBreak: 'break-all', color: colors.text }}>
                      {statsCampaign.destination_url || '—'}
                    </strong>
                  </div>

                  <div className="marketplace-row">
                    <span>Skip After</span>
                    <strong style={{ color: colors.text }}>{statsCampaign.skip_after_seconds || 0}s</strong>
                  </div>

                  <div className="marketplace-row">
                    <span>Start Date</span>
                    <strong style={{ color: colors.text }}>{formatDate(statsCampaign.starts_at)}</strong>
                  </div>

                  <div className="marketplace-row">
                    <span>End Date</span>
                    <strong style={{ color: colors.text }}>{formatDate(statsCampaign.ends_at)}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="dashboard-empty-box" style={{ marginTop: 16 }}>
                No campaign performance loaded yet.
              </div>
            )}
          </div>
        </section>

        {(latestCampaign || latestAdVideo) ? (
          <section className="videogad-dashboard-content-grid lower">
            <div className="videogad-panel" style={panelStyle}>
              <div className="panel-head">
                <h2 style={sectionHeaderStyle}>Latest Campaign Report</h2>
              </div>

              {latestCampaign ? (
                <div className="videogad-video-table">
                  <div className="videogad-video-row">
                    <div className="video-main">
                      <div className="video-thumb-placeholder">AD</div>
                      <div>
                        <h4 style={{ color: colors.text }}>{latestCampaign.title || 'Untitled campaign'}</h4>
                        <p style={{ color: colors.subtext }}>{latestCampaign.advertiser_name || 'Unknown advertiser'}</p>
                      </div>
                    </div>

                    <div className="video-meta">
                      <span className={`status-badge ${getStatusClass(latestCampaign.status)}`}>
                        {normalizeStatus(latestCampaign.status)}
                      </span>
                      <span style={{ color: colors.text }}>ID: {latestCampaign.id || '—'}</span>
                    </div>
                  </div>

                  <div className="admin-panels-grid" style={{ marginTop: 16 }}>
                    <div className="admin-card" style={statCardStyle}>
                      <p className="admin-card-label" style={{ color: colors.subtext }}>Budget</p>
                      <h3 className="admin-card-value" style={{ color: colors.text }}>${formatMoney(latestCampaign.budget || 0)}</h3>
                    </div>

                    <div className="admin-card" style={statCardStyle}>
                      <p className="admin-card-label" style={{ color: colors.subtext }}>Skip After</p>
                      <h3 className="admin-card-value" style={{ color: colors.text }}>{latestCampaign.skip_after_seconds || 0}s</h3>
                    </div>

                    <div className="admin-card" style={statCardStyle}>
                      <p className="admin-card-label" style={{ color: colors.subtext }}>View Charge</p>
                      <h3 className="admin-card-value" style={{ color: colors.text }}>
                        ${formatMoney(latestPricing?.cost_per_view || latestCampaign.cost_per_view || 0)}
                      </h3>
                    </div>

                    <div className="admin-card" style={statCardStyle}>
                      <p className="admin-card-label" style={{ color: colors.subtext }}>Click Charge</p>
                      <h3 className="admin-card-value" style={{ color: colors.text }}>
                        ${formatMoney(latestPricing?.cost_per_click || latestCampaign.cost_per_click || 0)}
                      </h3>
                    </div>
                  </div>

                  <div style={{ ...marketplaceBoxStyle, marginTop: 16 }}>
                    <div className="marketplace-row">
                      <span>Destination URL</span>
                      <strong style={{ wordBreak: 'break-all', color: colors.text }}>
                        {latestCampaign.destination_url || '—'}
                      </strong>
                    </div>

                    <div className="marketplace-row">
                      <span>Start Date</span>
                      <strong style={{ color: colors.text }}>{formatDate(latestCampaign.starts_at)}</strong>
                    </div>

                    <div className="marketplace-row">
                      <span>End Date</span>
                      <strong style={{ color: colors.text }}>{formatDate(latestCampaign.ends_at)}</strong>
                    </div>

                    <div className="marketplace-row">
                      <span>Created</span>
                      <strong style={{ color: colors.text }}>{formatDate(latestCampaign.created_at)}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="dashboard-empty-box">No campaign report yet.</div>
              )}
            </div>

            <div className="videogad-panel" style={panelStyle}>
              <div className="panel-head">
                <h2 style={sectionHeaderStyle}>Latest Ad Video Report</h2>
              </div>

              {latestAdVideo ? (
                <div className="videogad-video-table">
                  <div className="videogad-video-row">
                    <div className="video-main">
                      <div className="video-thumb-placeholder">VID</div>
                      <div>
                        <h4 style={{ color: colors.text }}>
                          {latestAdVideo.title || latestAdVideo.ad_video_title || 'Untitled ad video'}
                        </h4>
                        <p style={{ color: colors.subtext }}>
                          Campaign ID: {latestAdVideo.campaign_id || adVideoForm.campaign_id || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="video-meta">
                      <span className={`status-badge ${getStatusClass(latestAdVideo.status)}`}>
                        {normalizeStatus(latestAdVideo.status)}
                      </span>
                      <span style={{ color: colors.text }}>ID: {latestAdVideo.id || '—'}</span>
                    </div>
                  </div>

                  <div className="admin-panels-grid" style={{ marginTop: 16 }}>
                    <div className="admin-card" style={statCardStyle}>
                      <p className="admin-card-label" style={{ color: colors.subtext }}>Linked Video</p>
                      <h3 className="admin-card-value" style={{ color: colors.text }}>{latestAdVideo.video_id || adVideoForm.video_id || '—'}</h3>
                    </div>

                    <div className="admin-card" style={statCardStyle}>
                      <p className="admin-card-label" style={{ color: colors.subtext }}>Duration</p>
                      <h3 className="admin-card-value" style={{ color: colors.text }}>
                        {latestAdVideo.duration_seconds || adVideoForm.ad_duration_seconds || 0}s
                      </h3>
                    </div>

                    <div className="admin-card" style={statCardStyle}>
                      <p className="admin-card-label" style={{ color: colors.subtext }}>Campaign</p>
                      <h3 className="admin-card-value" style={{ color: colors.text }}>
                        {latestAdVideo.campaign_id || adVideoForm.campaign_id || '—'}
                      </h3>
                    </div>

                    <div className="admin-card" style={statCardStyle}>
                      <p className="admin-card-label" style={{ color: colors.subtext }}>Created</p>
                      <h3 className="admin-card-value" style={{ color: colors.text }}>{formatDate(latestAdVideo.created_at)}</h3>
                    </div>
                  </div>

                  <div style={{ ...marketplaceBoxStyle, marginTop: 16 }}>
                    <div className="marketplace-row">
                      <span>Ad Title</span>
                      <strong style={{ color: colors.text }}>{latestAdVideo.title || latestAdVideo.ad_video_title || '—'}</strong>
                    </div>

                    <div className="marketplace-row">
                      <span>Status</span>
                      <strong style={{ color: colors.text }}>{normalizeStatus(latestAdVideo.status)}</strong>
                    </div>

                    <div className="marketplace-row">
                      <span>Campaign ID</span>
                      <strong style={{ color: colors.text }}>{latestAdVideo.campaign_id || adVideoForm.campaign_id || '—'}</strong>
                    </div>

                    <div className="marketplace-row">
                      <span>Video ID</span>
                      <strong style={{ color: colors.text }}>{latestAdVideo.video_id || adVideoForm.video_id || '—'}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="dashboard-empty-box">No ad video report yet.</div>
              )}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default CreatorAdsPage;