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
  if (!Number.isFinite(amount)) return '0';
  return amount.toLocaleString();
}

function CreatorAdsPage() {
  const [menuOpen, setMenuOpen] = useState(false);
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
  });

  const [adVideoForm, setAdVideoForm] = useState({
    campaign_id: '',
    video_id: '',
    ad_video_title: '',
    ad_video_description: '',
    ad_video_url: '',
    ad_thumbnail_url: '',
    ad_duration_seconds: '',
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

  const channelName = getValue(channel, ['channel_name', 'name', 'title'], 'Creator');
  const channelHandle = getValue(channel, ['channel_handle', 'handle'], '');
  const channelSlug = getValue(channel, ['channel_slug', 'slug'], '');
  const hasChannel = !!(channel?.id || channel?.channel_name || channel?.name);

  const usableVideos = useMemo(() => {
    return videos.map((video, index) => ({
      id: video?.id || index + 1,
      title: video?.title || `Video ${index + 1}`,
      status: video?.status || video?.moderation_status || 'unknown',
      views: Number(video?.views_count || video?.views || 0),
      thumbnail:
        video?.thumbnail_url ||
        video?.thumbnail ||
        video?.cover_image ||
        '',
    }));
  }, [videos]);

  function handleCampaignChange(event) {
    const { name, value } = event.target;
    setCampaignForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleAdVideoChange(event) {
    const { name, value } = event.target;
    setAdVideoForm((prev) => ({ ...prev, [name]: value }));
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
      const response = await creatorAdsService.createAdVideo(adVideoForm);
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

  if (loading) {
    return (
      <div className="videogad-dashboard-page">
        <main className="videogad-dashboard-main">
          <div className="videogad-panel">
            <h2>Loading ads page...</h2>
          </div>
        </main>
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
          <a href="/creator-dashboard">Dashboard</a>
          <a href="/create-channel">{hasChannel ? 'Edit Channel' : 'Create Channel'}</a>
          <a href="/upload-video">Upload Video</a>
          <a href="/my-videos">My Videos</a>
          <a href="/creator-analytics">Analytics</a>
          <a href="/creator-ads" className="active">Ads</a>
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
              <p className="eyebrow">Creator Ads</p>
              <h1>Create and track your ads</h1>
              <span>Select a video, submit campaign details, then monitor performance after approval.</span>
            </div>
          </div>
        </header>

        {error ? (
          <div className="videogad-panel" style={{ border: '1px solid #5c1f24' }}>
            <strong>{error}</strong>
          </div>
        ) : null}

        {message ? (
          <div className="videogad-panel" style={{ border: '1px solid #1d4d34' }}>
            <strong>{message}</strong>
          </div>
        ) : null}

        <section className="videogad-stats-grid">
          <div className="videogad-stat-card">
            <p>Total Videos</p>
            <h3>{formatCompactNumber(summary?.total_videos || usableVideos.length)}</h3>
            <span>Available for promotion</span>
          </div>

          <div className="videogad-stat-card">
            <p>Total Views</p>
            <h3>{formatCompactNumber(summary?.total_views || 0)}</h3>
            <span>Audience reach</span>
          </div>

          <div className="videogad-stat-card">
            <p>Product Clicks</p>
            <h3>{formatCompactNumber(summary?.product_clicks || 0)}</h3>
            <span>Commercial interest</span>
          </div>

          <div className="videogad-stat-card">
            <p>Campaign Stats Lookup</p>
            <h3>{campaignStats ? 'Ready' : '—'}</h3>
            <span>Use campaign ID to load performance</span>
          </div>
        </section>

        <section className="videogad-dashboard-content-grid">
          <div className="videogad-panel large">
            <div className="panel-head">
              <h2>Create Ad Campaign</h2>
            </div>

            <form className="admin-form" onSubmit={handleCreateCampaign}>
              <select
                className="admin-input"
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
                name="advertiser_name"
                placeholder="Advertiser name"
                value={campaignForm.advertiser_name}
                onChange={handleCampaignChange}
                required
              />

              <input
                className="admin-input"
                name="title"
                placeholder="Campaign title"
                value={campaignForm.title}
                onChange={handleCampaignChange}
                required
              />

              <textarea
                className="admin-input admin-textarea"
                name="description"
                placeholder="Campaign description"
                value={campaignForm.description}
                onChange={handleCampaignChange}
              />

              <input
                className="admin-input"
                name="destination_url"
                placeholder="Destination URL"
                value={campaignForm.destination_url}
                onChange={handleCampaignChange}
                required
              />

              <select
                className="admin-input"
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
                  name="payment_reference"
                  placeholder="Payment reference"
                  value={campaignForm.payment_reference}
                  onChange={handleCampaignChange}
                />
              </div>

              <div className="admin-panels-grid">
                <input
                  className="admin-input"
                  name="start_date"
                  type="date"
                  value={campaignForm.start_date}
                  onChange={handleCampaignChange}
                />

                <input
                  className="admin-input"
                  name="end_date"
                  type="date"
                  value={campaignForm.end_date}
                  onChange={handleCampaignChange}
                />
              </div>

              <textarea
                className="admin-input admin-textarea"
                name="payment_note"
                placeholder="Payment note"
                value={campaignForm.payment_note}
                onChange={handleCampaignChange}
              />

              <div className="admin-actions">
                <button
                  className="admin-btn success"
                  type="submit"
                  disabled={submittingCampaign}
                >
                  {submittingCampaign ? 'Submitting...' : 'Submit Campaign'}
                </button>
              </div>
            </form>
          </div>

          <div className="videogad-panel">
            <div className="panel-head">
              <h2>Selected Video List</h2>
            </div>

            <div className="videogad-video-table">
              {usableVideos.length ? (
                usableVideos.slice(0, 6).map((video) => (
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
                        <p>Status: {video.status}</p>
                      </div>
                    </div>

                    <div className="video-meta">
                      <span>{formatCompactNumber(video.views)} views</span>
                      <button
                        className="admin-btn secondary"
                        type="button"
                        onClick={() => {
                          setCampaignForm((prev) => ({ ...prev, video_id: String(video.id) }));
                          setAdVideoForm((prev) => ({ ...prev, video_id: String(video.id) }));
                        }}
                      >
                        Use Video
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="dashboard-empty-box">No creator videos found yet.</div>
              )}
            </div>
          </div>
        </section>

        <section className="videogad-dashboard-content-grid lower">
          <div className="videogad-panel">
            <div className="panel-head">
              <h2>Create Ad Video</h2>
            </div>

            <form className="admin-form" onSubmit={handleCreateAdVideo}>
              <input
                className="admin-input"
                name="campaign_id"
                placeholder="Campaign ID"
                value={adVideoForm.campaign_id}
                onChange={handleAdVideoChange}
              />

              <select
                className="admin-input"
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
                name="ad_video_title"
                placeholder="Ad video title"
                value={adVideoForm.ad_video_title}
                onChange={handleAdVideoChange}
                required
              />

              <textarea
                className="admin-input admin-textarea"
                name="ad_video_description"
                placeholder="Ad video description"
                value={adVideoForm.ad_video_description}
                onChange={handleAdVideoChange}
              />

              <input
                className="admin-input"
                name="ad_video_url"
                placeholder="Ad video URL"
                value={adVideoForm.ad_video_url}
                onChange={handleAdVideoChange}
                required
              />

              <input
                className="admin-input"
                name="ad_thumbnail_url"
                placeholder="Ad thumbnail URL"
                value={adVideoForm.ad_thumbnail_url}
                onChange={handleAdVideoChange}
              />

              <input
                className="admin-input"
                name="ad_duration_seconds"
                placeholder="Ad duration in seconds"
                type="number"
                min="1"
                value={adVideoForm.ad_duration_seconds}
                onChange={handleAdVideoChange}
              />

              <div className="admin-actions">
                <button
                  className="admin-btn success"
                  type="submit"
                  disabled={submittingAdVideo}
                >
                  {submittingAdVideo ? 'Submitting...' : 'Submit Ad Video'}
                </button>
              </div>
            </form>
          </div>

          <div className="videogad-panel">
            <div className="panel-head">
              <h2>Campaign Performance</h2>
            </div>

            <div className="admin-form">
              <input
                className="admin-input"
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
              <div className="admin-card">
                <p className="admin-card-label">Impressions</p>
                <h3 className="admin-card-value">
                  {formatCompactNumber(
                    campaignStats?.impressions ||
                      campaignStats?.total_impressions ||
                      0
                  )}
                </h3>
              </div>

              <div className="admin-card">
                <p className="admin-card-label">Clicks</p>
                <h3 className="admin-card-value">
                  {formatCompactNumber(
                    campaignStats?.clicks ||
                      campaignStats?.total_clicks ||
                      0
                  )}
                </h3>
              </div>

              <div className="admin-card">
                <p className="admin-card-label">Skips</p>
                <h3 className="admin-card-value">
                  {formatCompactNumber(
                    campaignStats?.skips ||
                      campaignStats?.total_skips ||
                      0
                  )}
                </h3>
              </div>

              <div className="admin-card">
                <p className="admin-card-label">Budget</p>
                <h3 className="admin-card-value">
                  ₦{formatMoney(
                    campaignStats?.budget ||
                      campaignStats?.budget_amount ||
                      campaignStats?.total_budget ||
                      0
                  )}
                </h3>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <pre className="admin-json-block">
                {JSON.stringify(campaignStats || {}, null, 2)}
              </pre>
            </div>
          </div>
        </section>

        {(campaignResponse || adVideoResponse) ? (
          <section className="videogad-dashboard-content-grid lower">
            <div className="videogad-panel">
              <div className="panel-head">
                <h2>Latest Campaign Response</h2>
              </div>
              <pre className="admin-json-block">
                {JSON.stringify(campaignResponse || {}, null, 2)}
              </pre>
            </div>

            <div className="videogad-panel">
              <div className="panel-head">
                <h2>Latest Ad Video Response</h2>
              </div>
              <pre className="admin-json-block">
                {JSON.stringify(adVideoResponse || {}, null, 2)}
              </pre>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default CreatorAdsPage;