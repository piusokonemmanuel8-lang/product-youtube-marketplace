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

function getSavedTheme() {
  try {
    return localStorage.getItem('videogad_ads_analytics_theme') || 'dark';
  } catch (error) {
    return 'dark';
  }
}

function titleStyle(isLight) {
  return {
    color: isLight ? '#111827' : '#ffffff',
    opacity: 1,
    visibility: 'visible',
    display: 'block',
    fontSize: '1.15rem',
    fontWeight: 800,
    lineHeight: 1.2,
    margin: 0,
  };
}

function mutedStyle(isLight) {
  return {
    color: isLight ? '#475569' : '#d7deef',
  };
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
  const [themeMode, setThemeMode] = useState(getSavedTheme());

  const isLight = themeMode === 'light';

  const pageStyle = {
    background: isLight ? '#f5f7fb' : '#0f1117',
    color: isLight ? '#111827' : '#ffffff',
    minHeight: '100vh',
  };

  const sidebarStyle = {
    background: isLight ? '#ffffff' : '#141824',
    borderRight: isLight
      ? '1px solid rgba(15, 23, 42, 0.08)'
      : '1px solid rgba(255, 255, 255, 0.06)',
  };

  const panelStyle = {
    background: isLight ? '#ffffff' : '#171c29',
    border: isLight
      ? '1px solid rgba(15, 23, 42, 0.08)'
      : '1px solid rgba(255, 255, 255, 0.06)',
    color: isLight ? '#111827' : '#ffffff',
  };

  const innerBoxStyle = {
    background: isLight ? '#f8fafc' : '#111521',
    border: isLight
      ? '1px solid rgba(15, 23, 42, 0.08)'
      : '1px solid rgba(255, 255, 255, 0.08)',
    color: isLight ? '#111827' : '#ffffff',
  };

  const ghostBtnStyle = {
    border: isLight
      ? '1px solid rgba(15, 23, 42, 0.12)'
      : '1px solid rgba(255, 255, 255, 0.14)',
    color: isLight ? '#111827' : '#ffffff',
    background: isLight ? '#ffffff' : 'transparent',
  };

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
    try {
      localStorage.setItem('videogad_ads_analytics_theme', themeMode);
    } catch (error) {}
  }, [themeMode]);

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

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('videogad_token');
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }

  function toggleThemeMode() {
    setThemeMode((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  return (
    <div className="videogad-dashboard-page" style={pageStyle}>
      <aside className={`videogad-dashboard-sidebar ${menuOpen ? 'open' : ''}`} style={sidebarStyle}>
        <div className="videogad-sidebar-top">
          <div className="videogad-brand" style={{ color: isLight ? '#111827' : '#ffffff' }}>VideoGad</div>

          <button
            className="videogad-close-menu"
            onClick={() => setMenuOpen(false)}
            type="button"
            style={{
              background: isLight ? '#eef2ff' : '#1d2333',
              color: isLight ? '#111827' : '#ffffff',
            }}
          >
            ✕
          </button>
        </div>

        <nav className="videogad-dashboard-nav">
          <a href="/creator-dashboard" style={{ color: isLight ? '#475569' : '#b9c0d4' }}>Dashboard</a>
          <a href="/create-channel" style={{ color: isLight ? '#475569' : '#b9c0d4' }}>Edit Channel</a>
          <a href="/upload-video" style={{ color: isLight ? '#475569' : '#b9c0d4' }}>Upload Video</a>
          <a href="/my-videos" style={{ color: isLight ? '#475569' : '#b9c0d4' }}>My Videos</a>
          <a href="/creator-analytics" style={{ color: isLight ? '#475569' : '#b9c0d4' }}>Analytics</a>
          <a href="/creator-ads" style={{ color: isLight ? '#475569' : '#b9c0d4' }}>Ads</a>
          <a
            href="/creator-ads-analytics"
            className="active"
            style={{
              color: isLight ? '#111827' : '#ffffff',
              background: isLight ? '#eef2ff' : undefined,
            }}
          >
            Ads Analytics
          </a>
          <a href="/creator-earnings" style={{ color: isLight ? '#475569' : '#b9c0d4' }}>Earnings</a>
          <a href="/creator-payout" style={{ color: isLight ? '#475569' : '#b9c0d4' }}>Payout</a>
          <a href="/account-settings" style={{ color: isLight ? '#475569' : '#b9c0d4' }}>Settings</a>

          <button
            type="button"
            className="dashboard-logout-btn"
            onClick={handleLogout}
            style={{ color: isLight ? '#111827' : '#ffffff' }}
          >
            Logout
          </button>
        </nav>
      </aside>

      <main className="videogad-dashboard-main" style={{ background: isLight ? '#f5f7fb' : '#0f1117' }}>
        <header className="videogad-dashboard-header">
          <div className="videogad-mobile-topbar">
            <button
              className="videogad-menu-toggle"
              onClick={() => setMenuOpen(true)}
              type="button"
              style={{
                background: isLight ? '#eef2ff' : '#1d2333',
                color: isLight ? '#111827' : '#ffffff',
              }}
            >
              ☰
            </button>
            <div className="videogad-mobile-brand" style={{ color: isLight ? '#111827' : '#ffffff' }}>
              VideoGad
            </div>
          </div>

          <div className="videogad-header-main">
            <div>
              <p className="eyebrow" style={{ color: isLight ? '#475569' : '#b6bed1' }}>Creator Studio</p>
              <h1 style={{ color: isLight ? '#111827' : '#ffffff' }}>Ads Analytics</h1>
              <span style={{ color: isLight ? '#475569' : '#b6bed1' }}>
                Real campaign performance, clicks, skips, impressions and ad videos.
              </span>
            </div>

            <div className="videogad-dashboard-header-actions">
              <button
                type="button"
                className="ghost-btn ads-theme-toggle-btn"
                onClick={toggleThemeMode}
                style={ghostBtnStyle}
              >
                {themeMode === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>

              <a href="/creator-ads" className="primary-btn">Manage Ads</a>
            </div>
          </div>
        </header>

        {error ? (
          <section className="videogad-panel" style={panelStyle}>
            <div className="dashboard-empty-box" style={innerBoxStyle}>{error}</div>
          </section>
        ) : null}

        <section className="videogad-stats-grid">
          <div className="videogad-stat-card" style={panelStyle}>
            <p style={mutedStyle(isLight)}>Total Campaigns</p>
            <h3 style={{ color: isLight ? '#111827' : '#ffffff' }}>{formatNumber(overall.total_campaigns)}</h3>
            <span style={mutedStyle(isLight)}>Creator campaigns</span>
          </div>

          <div className="videogad-stat-card" style={panelStyle}>
            <p style={mutedStyle(isLight)}>Total Ad Videos</p>
            <h3 style={{ color: isLight ? '#111827' : '#ffffff' }}>{formatNumber(overall.total_ad_videos)}</h3>
            <span style={mutedStyle(isLight)}>Videos used for ads</span>
          </div>

          <div className="videogad-stat-card" style={panelStyle}>
            <p style={mutedStyle(isLight)}>Total Impressions</p>
            <h3 style={{ color: isLight ? '#111827' : '#ffffff' }}>{formatNumber(overall.total_impressions)}</h3>
            <span style={mutedStyle(isLight)}>Real delivery count</span>
          </div>

          <div className="videogad-stat-card" style={panelStyle}>
            <p style={mutedStyle(isLight)}>Total Clicks</p>
            <h3 style={{ color: isLight ? '#111827' : '#ffffff' }}>{formatNumber(overall.total_clicks)}</h3>
            <span style={mutedStyle(isLight)}>Ad click actions</span>
          </div>

          <div className="videogad-stat-card" style={panelStyle}>
            <p style={mutedStyle(isLight)}>Total Skips</p>
            <h3 style={{ color: isLight ? '#111827' : '#ffffff' }}>{formatNumber(overall.total_skips)}</h3>
            <span style={mutedStyle(isLight)}>Viewer skips</span>
          </div>
        </section>

        <section className="videogad-dashboard-content-grid">
          <div className="videogad-panel large" style={panelStyle}>
            <div className="panel-head">
              <div style={titleStyle(isLight)}>My Ad Campaigns</div>
              <span style={mutedStyle(isLight)}>{statsLoading ? 'Loading stats...' : `${campaigns.length} campaigns`}</span>
            </div>

            {loading ? (
              <div className="dashboard-empty-box" style={innerBoxStyle}>Loading campaigns...</div>
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
                      className={`videogad-video-row ads-analytics-row ${isActive ? 'ads-analytics-row-active' : ''}`}
                      style={innerBoxStyle}
                    >
                      <div className="video-main">
                        <div className="video-thumb-placeholder">AD</div>

                        <div className="ads-analytics-main-copy">
                          <h4 style={{ color: isLight ? '#111827' : '#ffffff' }}>{pickCampaignTitle(campaign)}</h4>
                          <p style={mutedStyle(isLight)}>
                            {campaign?.advertiser_name || 'Advertiser'} • {formatDate(campaign?.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="video-meta ads-analytics-meta">
                        <span className={`status-badge ${getStatusClass(campaign?.status)}`}>
                          {formatStatus(campaign?.status)}
                        </span>
                        <span style={mutedStyle(isLight)}>{formatNumber(stats?.total_impressions)} impressions</span>
                        <span style={mutedStyle(isLight)}>{formatNumber(stats?.total_clicks)} clicks</span>
                        <span style={mutedStyle(isLight)}>{formatNumber(stats?.total_skips)} skips</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="dashboard-empty-box" style={innerBoxStyle}>No ad campaigns yet.</div>
            )}
          </div>

          <div className="videogad-panel" style={panelStyle}>
            <div className="panel-head">
              <div style={titleStyle(isLight)}>Selected Campaign</div>
            </div>

            {selectedCampaign ? (
              <div className="marketplace-status-box ads-analytics-selected-box" style={innerBoxStyle}>
                <div className="marketplace-row">
                  <span style={mutedStyle(isLight)}>Campaign</span>
                  <strong style={{ color: isLight ? '#111827' : '#ffffff' }}>{pickCampaignTitle(selectedCampaign)}</strong>
                </div>

                <div className="marketplace-row">
                  <span style={mutedStyle(isLight)}>Status</span>
                  <strong style={{ color: isLight ? '#111827' : '#ffffff' }}>{formatStatus(selectedCampaign?.status)}</strong>
                </div>

                <div className="marketplace-row">
                  <span style={mutedStyle(isLight)}>Impressions</span>
                  <strong style={{ color: isLight ? '#111827' : '#ffffff' }}>{formatNumber(selectedStats?.total_impressions)}</strong>
                </div>

                <div className="marketplace-row">
                  <span style={mutedStyle(isLight)}>Clicks</span>
                  <strong style={{ color: isLight ? '#111827' : '#ffffff' }}>{formatNumber(selectedStats?.total_clicks)}</strong>
                </div>

                <div className="marketplace-row">
                  <span style={mutedStyle(isLight)}>Skips</span>
                  <strong style={{ color: isLight ? '#111827' : '#ffffff' }}>{formatNumber(selectedStats?.total_skips)}</strong>
                </div>

                <div className="marketplace-row">
                  <span style={mutedStyle(isLight)}>CTR</span>
                  <strong style={{ color: isLight ? '#111827' : '#ffffff' }}>{calcCtr(selectedStats?.total_clicks, selectedStats?.total_impressions)}</strong>
                </div>

                <div className="marketplace-row">
                  <span style={mutedStyle(isLight)}>Skip Rate</span>
                  <strong style={{ color: isLight ? '#111827' : '#ffffff' }}>{calcSkipRate(selectedStats?.total_skips, selectedStats?.total_impressions)}</strong>
                </div>

                <div className="marketplace-row">
                  <span style={mutedStyle(isLight)}>Ad Videos</span>
                  <strong style={{ color: isLight ? '#111827' : '#ffffff' }}>{formatNumber(selectedVideos.length)}</strong>
                </div>

                <div className="marketplace-row">
                  <span style={mutedStyle(isLight)}>Start Date</span>
                  <strong style={{ color: isLight ? '#111827' : '#ffffff' }}>{formatDate(selectedCampaign?.starts_at)}</strong>
                </div>

                <div className="marketplace-row">
                  <span style={mutedStyle(isLight)}>End Date</span>
                  <strong style={{ color: isLight ? '#111827' : '#ffffff' }}>{formatDate(selectedCampaign?.ends_at)}</strong>
                </div>
              </div>
            ) : (
              <div className="dashboard-empty-box" style={innerBoxStyle}>Select a campaign to view analytics.</div>
            )}
          </div>
        </section>

        <section className="videogad-panel" style={panelStyle}>
          <div className="panel-head">
            <div style={titleStyle(isLight)}>Ad Videos In Selected Campaign</div>
          </div>

          {selectedCampaign ? (
            selectedVideos.length ? (
              <div className="videogad-video-table">
                {selectedVideos.map((video) => (
                  <div className="videogad-video-row ads-analytics-video-row" key={video.id} style={innerBoxStyle}>
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

                      <div className="ads-analytics-main-copy">
                        <h4 style={{ color: isLight ? '#111827' : '#ffffff' }}>{pickVideoTitle(video)}</h4>
                        <p style={mutedStyle(isLight)}>
                          Duration: {formatNumber(video?.duration_seconds)}s • Created: {formatDate(video?.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="video-meta ads-analytics-meta">
                      <span className={`status-badge ${getStatusClass(video?.status)}`}>
                        {formatStatus(video?.status)}
                      </span>
                      <span style={mutedStyle(isLight)}>{video?.campaign_title || pickCampaignTitle(selectedCampaign)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-box" style={innerBoxStyle}>No ad videos found for this campaign.</div>
            )
          ) : (
            <div className="dashboard-empty-box" style={innerBoxStyle}>Select a campaign first.</div>
          )}
        </section>
      </main>
    </div>
  );
}

export default CreatorAdsAnalyticsPage;