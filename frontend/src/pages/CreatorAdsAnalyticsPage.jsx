import React, { useEffect, useMemo, useState } from 'react';
import '../creator-dashboard.css';
import creatorAdsService from '../services/creatorAdsService';

function formatNumber(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0';
  return number.toLocaleString();
}

function formatStatus(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Unknown';

  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusClass(value) {
  return String(value || 'unknown').toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString();
}

function calcCtr(clicks, impressions) {
  const c = Number(clicks || 0);
  const i = Number(impressions || 0);

  if (!i) return '0%';
  return `${((c / i) * 100).toFixed(2)}%`;
}

function calcSkipRate(skips, impressions) {
  const s = Number(skips || 0);
  const i = Number(impressions || 0);

  if (!i) return '0%';
  return `${((s / i) * 100).toFixed(2)}%`;
}

function pickCampaignId(item) {
  return Number(item?.campaign_id || item?.id || 0);
}

function pickCampaignTitle(item) {
  return (
    item?.title ||
    item?.campaign_title ||
    item?.advertiser_name ||
    `Campaign #${pickCampaignId(item)}`
  );
}

function pickVideoTitle(video) {
  return video?.title || video?.ad_title || `Ad Video #${video?.id || ''}`;
}

function groupVideosByCampaign(videos) {
  const map = new Map();

  for (const video of videos || []) {
    const campaignId = Number(video?.campaign_id || 0);
    if (!campaignId) continue;

    if (!map.has(campaignId)) {
      map.set(campaignId, []);
    }

    map.get(campaignId).push(video);
  }

  return map;
}

function CreatorAdsAnalyticsPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [adVideos, setAdVideos] = useState([]);
  const [statsMap, setStatsMap] = useState({});
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPage() {
      try {
        setLoading(true);
        setError('');

        const [campaignsResponse, videosResponse] = await Promise.all([
          creatorAdsService.getMyAdCampaigns(),
          creatorAdsService.getMyAdVideos(),
        ]);

        const campaignsList = Array.isArray(campaignsResponse?.campaigns)
          ? campaignsResponse.campaigns
          : [];

        const videosList = Array.isArray(videosResponse?.ad_videos)
          ? videosResponse.ad_videos
          : [];

        setCampaigns(campaignsList);
        setAdVideos(videosList);

        if (campaignsList.length) {
          setSelectedCampaignId(Number(campaignsList[0].id));
        } else {
          setSelectedCampaignId(null);
        }
      } catch (err) {
        setError(err?.message || 'Failed to load ad analytics');
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, []);

  useEffect(() => {
    async function loadStats() {
      if (!campaigns.length) return;

      try {
        setStatsLoading(true);

        const results = await Promise.all(
          campaigns.map(async (campaign) => {
            const campaignId = Number(campaign.id);

            try {
              const response = await creatorAdsService.getCampaignStats(campaignId);
              return [campaignId, response?.stats || null];
            } catch (err) {
              return [campaignId, null];
            }
          })
        );

        const nextStatsMap = {};
        for (const [campaignId, stats] of results) {
          nextStatsMap[campaignId] = stats;
        }

        setStatsMap(nextStatsMap);
      } finally {
        setStatsLoading(false);
      }
    }

    loadStats();
  }, [campaigns]);

  const videosByCampaign = useMemo(() => groupVideosByCampaign(adVideos), [adVideos]);

  const selectedCampaign = useMemo(() => {
    return campaigns.find((item) => Number(item.id) === Number(selectedCampaignId)) || null;
  }, [campaigns, selectedCampaignId]);

  const selectedStats = selectedCampaign ? statsMap[Number(selectedCampaign.id)] || null : null;

  const selectedVideos = useMemo(() => {
    if (!selectedCampaignId) return [];
    return videosByCampaign.get(Number(selectedCampaignId)) || [];
  }, [videosByCampaign, selectedCampaignId]);

  const overall = useMemo(() => {
    let impressions = 0;
    let clicks = 0;
    let skips = 0;

    for (const campaign of campaigns) {
      const stats = statsMap[Number(campaign.id)];
      impressions += Number(stats?.total_impressions || 0);
      clicks += Number(stats?.total_clicks || 0);
      skips += Number(stats?.total_skips || 0);
    }

    return {
      total_campaigns: campaigns.length,
      total_ad_videos: adVideos.length,
      total_impressions: impressions,
      total_clicks: clicks,
      total_skips: skips,
    };
  }, [campaigns, adVideos, statsMap]);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('videogad_token');
    localStorage.removeItem('authToken');
    window.location.href = '/login';
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
          <a href="/create-channel">Edit Channel</a>
          <a href="/upload-video">Upload Video</a>
          <a href="/my-videos">My Videos</a>
          <a href="/creator-analytics">Analytics</a>
          <a href="/creator-ads">Ads</a>
          <a href="/creator-ads-analytics" className="active">Ads Analytics</a>
          <a href="/creator-earnings">Earnings</a>
          <a href="/creator-payout">Payout</a>
          <a href="/account-settings">Settings</a>

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
              <h1>Ads Analytics</h1>
              <span>Real campaign performance, clicks, skips, impressions and ad videos.</span>
            </div>

            <div className="videogad-dashboard-header-actions">
              <a href="/creator-ads" className="primary-btn">Manage Ads</a>
            </div>
          </div>
        </header>

        {error ? (
          <section className="videogad-panel">
            <div className="dashboard-empty-box">{error}</div>
          </section>
        ) : null}

        <section className="videogad-stats-grid">
          <div className="videogad-stat-card">
            <p>Total Campaigns</p>
            <h3>{formatNumber(overall.total_campaigns)}</h3>
            <span>Creator campaigns</span>
          </div>

          <div className="videogad-stat-card">
            <p>Total Ad Videos</p>
            <h3>{formatNumber(overall.total_ad_videos)}</h3>
            <span>Videos used for ads</span>
          </div>

          <div className="videogad-stat-card">
            <p>Total Impressions</p>
            <h3>{formatNumber(overall.total_impressions)}</h3>
            <span>Real delivery count</span>
          </div>

          <div className="videogad-stat-card">
            <p>Total Clicks</p>
            <h3>{formatNumber(overall.total_clicks)}</h3>
            <span>Ad click actions</span>
          </div>

          <div className="videogad-stat-card">
            <p>Total Skips</p>
            <h3>{formatNumber(overall.total_skips)}</h3>
            <span>Viewer skips</span>
          </div>
        </section>

        <section className="videogad-dashboard-content-grid">
          <div className="videogad-panel large">
            <div className="panel-head">
              <h2>My Ad Campaigns</h2>
              {statsLoading ? <span>Loading stats...</span> : <span>{campaigns.length} campaigns</span>}
            </div>

            {loading ? (
              <div className="dashboard-empty-box">Loading campaigns...</div>
            ) : campaigns.length ? (
              <div className="videogad-video-table">
                {campaigns.map((campaign) => {
                  const campaignId = Number(campaign.id);
                  const stats = statsMap[campaignId] || {};
                  const isActive = Number(selectedCampaignId) === campaignId;

                  return (
                    <button
                      key={campaignId}
                      type="button"
                      onClick={() => setSelectedCampaignId(campaignId)}
                      className="videogad-video-row"
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                        border: isActive ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                        borderRadius: '16px',
                        cursor: 'pointer',
                      }}
                    >
                      <div className="video-main">
                        <div className="video-thumb-placeholder">AD</div>

                        <div>
                          <h4>{pickCampaignTitle(campaign)}</h4>
                          <p>
                            {campaign?.advertiser_name || 'Advertiser'} • {formatDate(campaign?.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="video-meta">
                        <span className={`status-badge ${getStatusClass(campaign?.status)}`}>
                          {formatStatus(campaign?.status)}
                        </span>
                        <span>{formatNumber(stats?.total_impressions)} impressions</span>
                        <span>{formatNumber(stats?.total_clicks)} clicks</span>
                        <span>{formatNumber(stats?.total_skips)} skips</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="dashboard-empty-box">No ad campaigns yet.</div>
            )}
          </div>

          <div className="videogad-panel">
            <div className="panel-head">
              <h2>Selected Campaign</h2>
            </div>

            {selectedCampaign ? (
              <div className="marketplace-status-box">
                <div className="marketplace-row">
                  <span>Campaign</span>
                  <strong>{pickCampaignTitle(selectedCampaign)}</strong>
                </div>

                <div className="marketplace-row">
                  <span>Status</span>
                  <strong>{formatStatus(selectedCampaign?.status)}</strong>
                </div>

                <div className="marketplace-row">
                  <span>Impressions</span>
                  <strong>{formatNumber(selectedStats?.total_impressions)}</strong>
                </div>

                <div className="marketplace-row">
                  <span>Clicks</span>
                  <strong>{formatNumber(selectedStats?.total_clicks)}</strong>
                </div>

                <div className="marketplace-row">
                  <span>Skips</span>
                  <strong>{formatNumber(selectedStats?.total_skips)}</strong>
                </div>

                <div className="marketplace-row">
                  <span>CTR</span>
                  <strong>{calcCtr(selectedStats?.total_clicks, selectedStats?.total_impressions)}</strong>
                </div>

                <div className="marketplace-row">
                  <span>Skip Rate</span>
                  <strong>{calcSkipRate(selectedStats?.total_skips, selectedStats?.total_impressions)}</strong>
                </div>

                <div className="marketplace-row">
                  <span>Ad Videos</span>
                  <strong>{formatNumber(selectedVideos.length)}</strong>
                </div>

                <div className="marketplace-row">
                  <span>Start Date</span>
                  <strong>{formatDate(selectedCampaign?.starts_at)}</strong>
                </div>

                <div className="marketplace-row">
                  <span>End Date</span>
                  <strong>{formatDate(selectedCampaign?.ends_at)}</strong>
                </div>
              </div>
            ) : (
              <div className="dashboard-empty-box">Select a campaign to view analytics.</div>
            )}
          </div>
        </section>

        <section className="videogad-panel">
          <div className="panel-head">
            <h2>Ad Videos In Selected Campaign</h2>
          </div>

          {selectedCampaign ? (
            selectedVideos.length ? (
              <div className="videogad-video-table">
                {selectedVideos.map((video) => (
                  <div className="videogad-video-row" key={video.id}>
                    <div className="video-main">
                      {video?.thumbnail_key ? (
                        <img
                          src={video.thumbnail_key}
                          alt={pickVideoTitle(video)}
                          className="video-thumb-placeholder"
                        />
                      ) : (
                        <div className="video-thumb-placeholder">Ad Video</div>
                      )}

                      <div>
                        <h4>{pickVideoTitle(video)}</h4>
                        <p>
                          Duration: {formatNumber(video?.duration_seconds)}s • Created: {formatDate(video?.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="video-meta">
                      <span className={`status-badge ${getStatusClass(video?.status)}`}>
                        {formatStatus(video?.status)}
                      </span>
                      <span>{video?.campaign_title || pickCampaignTitle(selectedCampaign)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-box">No ad videos found for this campaign.</div>
            )
          ) : (
            <div className="dashboard-empty-box">Select a campaign first.</div>
          )}
        </section>
      </main>
    </div>
  );
}

export default CreatorAdsAnalyticsPage;