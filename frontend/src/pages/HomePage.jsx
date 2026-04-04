import React, { useEffect, useMemo, useState } from 'react';
import { getCategories, getCategoryTree } from '../services/categoryService';
import { apiRequest } from '../services/api';
import {
  getPublicVideos,
  getSavedVideos,
  getWatchHistoryVideos,
} from '../services/homeService';
import './HomePage.css';

function normalizeArrayResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.categories)) return data.categories;
  if (Array.isArray(data?.videos)) return data.videos;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.saved_videos)) return data.saved_videos;
  if (Array.isArray(data?.history)) return data.history;
  return [];
}

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

function formatViews(value) {
  return `${formatCompactNumber(value)} views`;
}

function normalizeCtaLabel(value) {
  const raw = String(value || '').trim();
  return raw || 'Buy Now';
}

function getCtaClassName(label) {
  const value = String(label || '').trim().toLowerCase();

  if (value === 'buy now') return 'cta-buy-now';
  if (value === 'shop now') return 'cta-shop-now';
  if (value === 'learn more') return 'cta-learn-more';
  if (value === 'get offer') return 'cta-get-offer';
  if (value === 'order now') return 'cta-order-now';
  if (value === 'visit store') return 'cta-visit-store';

  return 'cta-buy-now';
}

function resolveVideoFormat(item) {
  const directFormat =
    item?.video_format ||
    item?.video?.video_format ||
    item?.saved_video?.video_format ||
    item?.history_video?.video_format;

  if (directFormat === 'short' || directFormat === 'regular') {
    return directFormat;
  }

  const duration =
    Number(
      item?.duration_seconds ??
        item?.video?.duration_seconds ??
        item?.saved_video?.duration_seconds ??
        item?.history_video?.duration_seconds ??
        0
    ) || 0;

  return duration > 0 && duration <= 60 ? 'short' : 'regular';
}

function unwrapVideoItem(item) {
  const video = item?.video || item?.saved_video || item?.history_video || item?.item || item || {};

  const resolvedViews =
    video?.views_count ??
    video?.views ??
    video?.view_count ??
    video?.total_views ??
    item?.views_count ??
    item?.views ??
    item?.view_count ??
    item?.total_views ??
    0;

  const resolvedDuration = video?.duration_seconds ?? item?.duration_seconds ?? 0;
  const resolvedVideoFormat = resolveVideoFormat(item);

  return {
    ...item,
    ...video,
    id: video?.id || item?.video_id || item?.id,
    slug: video?.slug || item?.video_slug || item?.slug,
    title: video?.title || item?.title,
    description: video?.description || item?.description,
    thumbnail_url: video?.thumbnail_url || item?.thumbnail_url,
    thumbnail_key: video?.thumbnail_key || item?.thumbnail_key,
    short_thumbnail_url: video?.short_thumbnail_url || item?.short_thumbnail_url,
    short_thumbnail_key: video?.short_thumbnail_key || item?.short_thumbnail_key,
    video_url: video?.video_url || item?.video_url,
    cta_label: normalizeCtaLabel(video?.cta_label || item?.cta_label),
    buy_now_url: video?.buy_now_url || item?.buy_now_url,
    buy_now_enabled:
      video?.buy_now_enabled ??
      item?.buy_now_enabled ??
      (video?.buy_now_url || item?.buy_now_url ? 1 : 0),
    published_at: video?.published_at || item?.published_at,
    created_at: video?.created_at || item?.created_at,
    channel_id: video?.channel_id || item?.channel_id,
    channel_name: video?.channel_name || item?.channel_name,
    creator_name: video?.creator_name || item?.creator_name,
    category_name: video?.category_name || item?.category_name,
    duration_seconds: Number(resolvedDuration || 0),
    video_format: resolvedVideoFormat,
    views_count: Number(resolvedViews || 0),
    views: Number(resolvedViews || 0),
    total_views: Number(resolvedViews || 0),
  };
}

function formatVideoMeta(video) {
  const creator =
    video?.channel_name ||
    video?.creator_name ||
    video?.creator ||
    'VideoGad Creator';

  const dateValue = video?.published_at || video?.created_at;
  let dateText = 'Recently added';

  if (dateValue) {
    const date = new Date(dateValue);
    if (!Number.isNaN(date.getTime())) {
      dateText = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  const resolvedViews =
    video?.views_count ??
    video?.views ??
    video?.view_count ??
    video?.total_views ??
    0;

  return {
    creator,
    meta: dateText,
    viewsText: formatViews(resolvedViews),
  };
}

function formatShortDuration(secondsValue) {
  const seconds = Number(secondsValue || 0);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 'Short';
  }

  if (seconds < 60) {
    return `0:${String(seconds).padStart(2, '0')}`;
  }

  const minutes = Math.floor(seconds / 60);
  const secondsLeft = seconds % 60;

  return `${minutes}:${String(secondsLeft).padStart(2, '0')}`;
}

function matchesSearch(video, term) {
  const query = String(term || '').trim().toLowerCase();
  if (!query) return true;

  const haystack = [
    video?.title,
    video?.description,
    video?.channel_name,
    video?.creator_name,
    video?.category_name,
    video?.slug,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function createRegularPlaceholders(count, startIndex = 0) {
  return Array.from({ length: count }, (_, index) => ({
    id: `regular-placeholder-${startIndex + index + 1}`,
    isPlaceholder: true,
    placeholderTitle: 'Featured Video',
  }));
}

function createShortPlaceholders(count, startIndex = 0) {
  return Array.from({ length: count }, (_, index) => ({
    id: `short-placeholder-${startIndex + index + 1}`,
    isPlaceholder: true,
    placeholderTitle: 'Short',
  }));
}

function fillWithPlaceholders(items, targetCount, type = 'regular', startIndex = 0) {
  const safeItems = Array.isArray(items) ? items.slice(0, targetCount) : [];
  const missing = Math.max(targetCount - safeItems.length, 0);

  if (missing === 0) return safeItems;

  const placeholders =
    type === 'short'
      ? createShortPlaceholders(missing, startIndex)
      : createRegularPlaceholders(missing, startIndex);

  return [...safeItems, ...placeholders];
}

function goToWatch(video) {
  if (!video?.slug) {
    window.location.href = '/watch';
    return;
  }

  window.location.href = `/watch/${video.slug}`;
}

function openBuyNow(video) {
  if (!video?.buy_now_enabled || !video?.buy_now_url) {
    return;
  }

  window.open(video.buy_now_url, '_blank', 'noopener,noreferrer');
}

function VideoCard({ video }) {
  const isPlaceholder = video?.isPlaceholder === true;
  const details = formatVideoMeta(video);
  const cardKey = video?.id || video?.video_id || video?.slug || Math.random().toString(36);
  const thumbnailUrl = video?.thumbnail_url || '';
  const ctaLabel = normalizeCtaLabel(video?.cta_label);
  const ctaClassName = getCtaClassName(ctaLabel);

  if (isPlaceholder) {
    return (
      <div className="vg-video-card" key={cardKey}>
        <div className="vg-video-thumb vg-video-thumb-placeholder">
          {video?.placeholderTitle || 'Featured Video'}
        </div>

        <div className="vg-video-info">
          <h3>Coming soon</h3>
          <div className="vg-creator-name">Marketplace Creator</div>
          <div className="vg-meta-text">Placeholder slot</div>
          <div className="vg-meta-text">0 views</div>

          <div className="vg-card-actions">
            <span className="vg-card-btn">Watch</span>
            <span className={`vg-card-btn vg-card-btn-light ${ctaClassName}`}>{ctaLabel}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vg-video-card" key={cardKey}>
      <div
        className={`vg-video-thumb ${thumbnailUrl ? 'has-image' : ''}`}
        style={thumbnailUrl ? { backgroundImage: `url(${thumbnailUrl})` } : undefined}
        onClick={() => goToWatch(video)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            goToWatch(video);
          }
        }}
      >
        {!thumbnailUrl ? (video?.thumbnail_key ? 'Video Thumbnail' : 'Featured Video') : null}
      </div>

      <div className="vg-video-info">
        <h3
          style={{ cursor: 'pointer' }}
          onClick={() => goToWatch(video)}
        >
          {video?.title || 'Untitled Video'}
        </h3>
        <div className="vg-creator-name">{details.creator}</div>
        <div className="vg-meta-text">{details.meta}</div>
        <div className="vg-meta-text">{details.viewsText}</div>

        <div className="vg-card-actions">
          <button
            type="button"
            className="vg-card-btn"
            onClick={() => goToWatch(video)}
          >
            Watch
          </button>

          {video?.buy_now_enabled == 1 && video?.buy_now_url ? (
            <button
              type="button"
              className={`vg-card-btn vg-card-btn-light ${ctaClassName}`}
              onClick={() => openBuyNow(video)}
            >
              {ctaLabel}
            </button>
          ) : (
            <span className={`vg-card-btn vg-card-btn-light ${ctaClassName}`}>{ctaLabel}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ShortCard({ video }) {
  const isPlaceholder = video?.isPlaceholder === true;
  const cardKey = video?.id || video?.video_id || video?.slug || Math.random().toString(36);
  const thumbnailUrl =
    video?.short_thumbnail_url ||
    video?.short_thumbnail_key ||
    video?.thumbnail_url ||
    '';
  const details = formatVideoMeta(video);
  const ctaLabel = normalizeCtaLabel(video?.cta_label);
  const ctaClassName = getCtaClassName(ctaLabel);

  if (isPlaceholder) {
    return (
      <div className="vg-short-card" key={cardKey}>
        <div className="vg-short-thumb vg-short-thumb-placeholder">
          {video?.placeholderTitle || 'Short'}
        </div>

        <h4>Coming soon</h4>
        <p>Placeholder short slot</p>

        <div className="vg-card-actions" style={{ marginTop: '10px' }}>
          <span className="vg-card-btn">Watch</span>
          <span className={`vg-card-btn vg-card-btn-light ${ctaClassName}`}>{ctaLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="vg-short-card" key={cardKey}>
      <div
        className={`vg-short-thumb ${thumbnailUrl ? 'has-image' : ''}`}
        style={thumbnailUrl ? { backgroundImage: `url(${thumbnailUrl})` } : undefined}
        onClick={() => goToWatch(video)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            goToWatch(video);
          }
        }}
      >
        {!thumbnailUrl ? 'Short' : null}

        <span
          style={{
            position: 'absolute',
            right: '10px',
            bottom: '10px',
            background: 'rgba(0,0,0,0.65)',
            color: '#fff',
            borderRadius: '999px',
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: 700,
            zIndex: 2,
          }}
        >
          {formatShortDuration(video?.duration_seconds)}
        </span>
      </div>

      <h4
        style={{ cursor: 'pointer' }}
        onClick={() => goToWatch(video)}
      >
        {video?.title || 'Untitled Short'}
      </h4>
      <p>{details.viewsText}</p>

      <div className="vg-card-actions" style={{ marginTop: '10px' }}>
        <button
          type="button"
          className="vg-card-btn"
          onClick={() => goToWatch(video)}
        >
          Watch
        </button>

        {video?.buy_now_enabled == 1 && video?.buy_now_url ? (
          <button
            type="button"
            className={`vg-card-btn vg-card-btn-light ${ctaClassName}`}
            onClick={() => openBuyNow(video)}
          >
            {ctaLabel}
          </button>
        ) : (
          <span className={`vg-card-btn vg-card-btn-light ${ctaClassName}`}>{ctaLabel}</span>
        )}
      </div>
    </div>
  );
}

function HomePage() {
  const [categories, setCategories] = useState([]);
  const [categoryTreeCount, setCategoryTreeCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [featuredVideos, setFeaturedVideos] = useState([]);
  const [shortVideos, setShortVideos] = useState([]);
  const [savedVideos, setSavedVideos] = useState([]);
  const [watchHistory, setWatchHistory] = useState([]);
  const [subscriptionVideos, setSubscriptionVideos] = useState([]);
  const [activeMenu, setActiveMenu] = useState('Home');
  const [loading, setLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [theme, setTheme] = useState('light');
  const [me, setMe] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');

  useEffect(() => {
    async function loadHomepageData() {
      setLoading(true);
      setErrorMessage('');

      try {
        const [categoriesResponse, treeResponse, videosResponse, shortsResponse] =
          await Promise.all([
            getCategories(),
            getCategoryTree(),
            getPublicVideos({ limit: 60, video_format: 'regular' }),
            getPublicVideos({ limit: 24, video_format: 'short' }),
          ]);

        const categoriesList = normalizeArrayResponse(categoriesResponse);
        const treeList = normalizeArrayResponse(treeResponse);
        const publicVideosList = normalizeArrayResponse(videosResponse).map(unwrapVideoItem);
        const publicShortsList = normalizeArrayResponse(shortsResponse).map(unwrapVideoItem);

        setCategories(categoriesList);
        setCategoryTreeCount(treeList.length);
        setFeaturedVideos(publicVideosList);
        setShortVideos(publicShortsList);
      } catch (error) {
        setErrorMessage(error.message || 'Failed to load homepage data');
      } finally {
        setLoading(false);
      }
    }

    async function loadMe() {
      try {
        const meResponse = await apiRequest('/auth/me', {
          method: 'GET',
        });

        setMe(meResponse?.user || meResponse?.data || meResponse || null);
      } catch (error) {
        setMe(null);
      }
    }

    loadHomepageData();
    loadMe();
  }, []);

  useEffect(() => {
    async function loadMenuData() {
      if (activeMenu === 'Home' || activeMenu === 'Trending' || activeMenu === 'Categories') {
        return;
      }

      if (!me) {
        return;
      }

      setSectionLoading(true);
      setErrorMessage('');

      try {
        if (activeMenu === 'Saved') {
          const data = await getSavedVideos();
          setSavedVideos(normalizeArrayResponse(data).map(unwrapVideoItem));
        }

        if (activeMenu === 'History') {
          const data = await getWatchHistoryVideos();
          setWatchHistory(normalizeArrayResponse(data).map(unwrapVideoItem));
        }

        if (activeMenu === 'Subscriptions') {
          const uniqueChannelVideos = [];
          const seen = new Set();

          featuredVideos.forEach((video) => {
            const channelId = video?.channel_id || video?.creator_channel_id || video?.creator_id;
            if (channelId && !seen.has(channelId)) {
              seen.add(channelId);
              uniqueChannelVideos.push(video);
            }
          });

          const checks = await Promise.all(
            uniqueChannelVideos.map(async (video) => {
              const channelId = video?.channel_id || video?.creator_channel_id || video?.creator_id;
              if (!channelId) return null;

              try {
                const summary = await apiRequest(`/channels/${channelId}/subscription`, {
                  method: 'GET',
                });

                const isSubscribed =
                  summary?.is_subscribed ||
                  summary?.subscribed ||
                  summary?.subscription_status === 'subscribed' ||
                  summary?.data?.is_subscribed;

                return isSubscribed ? video : null;
              } catch (error) {
                return null;
              }
            })
          );

          setSubscriptionVideos(checks.filter(Boolean));
        }
      } catch (error) {
        setErrorMessage(error.message || 'Failed to load section');
      } finally {
        setSectionLoading(false);
      }
    }

    loadMenuData();
  }, [activeMenu, me, featuredVideos]);

  const categoryPills = useMemo(() => {
    const names = categories.map((item) => {
      return (
        item?.name ||
        item?.title ||
        item?.category_name ||
        `Category ${item?.id ?? ''}`.trim()
      );
    });

    return ['All', ...names.filter(Boolean)];
  }, [categories]);

  const regularFeaturedVideos = useMemo(() => {
    return featuredVideos.filter((video) => resolveVideoFormat(video) === 'regular');
  }, [featuredVideos]);

  const onlyShortVideos = useMemo(() => {
    return shortVideos.filter((video) => resolveVideoFormat(video) === 'short');
  }, [shortVideos]);

  const searchedRegularVideos = useMemo(() => {
    return regularFeaturedVideos.filter((video) => matchesSearch(video, submittedSearch));
  }, [regularFeaturedVideos, submittedSearch]);

  const searchedShortVideos = useMemo(() => {
    return onlyShortVideos.filter((video) => matchesSearch(video, submittedSearch));
  }, [onlyShortVideos, submittedSearch]);

  const trendingVideos = useMemo(() => {
    return [...regularFeaturedVideos]
      .sort((a, b) => {
        const aViews = Number(a?.views_count || a?.views || a?.view_count || a?.total_views || 0);
        const bViews = Number(b?.views_count || b?.views || b?.view_count || b?.total_views || 0);
        return bViews - aViews;
      })
      .filter((video) => matchesSearch(video, submittedSearch));
  }, [regularFeaturedVideos, submittedSearch]);

  const categoriesVideos = useMemo(() => {
    const source = regularFeaturedVideos;

    const filteredByCategory =
      selectedCategory === 'All'
        ? source
        : source.filter((video) => {
            const categoryName =
              video?.category_name ||
              video?.category ||
              video?.category_title ||
              '';

            return String(categoryName).toLowerCase() === String(selectedCategory).toLowerCase();
          });

    return filteredByCategory.filter((video) => matchesSearch(video, submittedSearch));
  }, [regularFeaturedVideos, selectedCategory, submittedSearch]);

  const currentVideos = useMemo(() => {
    if (activeMenu === 'Trending') return trendingVideos;
    if (activeMenu === 'Categories') return categoriesVideos;
    if (activeMenu === 'Saved') {
      return savedVideos
        .filter((video) => resolveVideoFormat(video) === 'regular')
        .filter((video) => matchesSearch(video, submittedSearch));
    }
    if (activeMenu === 'History') {
      return watchHistory
        .filter((video) => resolveVideoFormat(video) === 'regular')
        .filter((video) => matchesSearch(video, submittedSearch));
    }
    if (activeMenu === 'Subscriptions') {
      return subscriptionVideos
        .filter((video) => resolveVideoFormat(video) === 'regular')
        .filter((video) => matchesSearch(video, submittedSearch));
    }
    return categoriesVideos;
  }, [
    activeMenu,
    trendingVideos,
    categoriesVideos,
    savedVideos,
    watchHistory,
    subscriptionVideos,
    submittedSearch,
  ]);

  const sectionTitle = useMemo(() => {
    if (activeMenu === 'Trending') return 'Trending Videos';
    if (activeMenu === 'Categories') return 'Category Videos';
    if (activeMenu === 'Saved') return 'Saved Videos';
    if (activeMenu === 'History') return 'Watch History';
    if (activeMenu === 'Subscriptions') return 'Subscriptions';
    return 'Featured Videos';
  }, [activeMenu]);

  const sectionText = useMemo(() => {
    if (activeMenu === 'Trending') return 'Videos ranked from the public feed.';
    if (activeMenu === 'Categories') return 'Browse videos by category.';
    if (activeMenu === 'Saved') return 'Videos you saved.';
    if (activeMenu === 'History') return 'Videos you watched before.';
    if (activeMenu === 'Subscriptions') return 'Latest videos from subscribed channels.';
    return currentVideos.length
      ? 'Live videos from the real public feed.'
      : 'No published public videos available yet.';
  }, [activeMenu, currentVideos.length]);

  const menuItems = ['Home', 'Trending', 'Categories', 'Saved', 'History', 'Subscriptions'];

  const userDisplayName =
    me?.full_name ||
    me?.username ||
    me?.name ||
    me?.email ||
    'My Account';

  const homeTopRegular = useMemo(() => {
    return fillWithPlaceholders(searchedRegularVideos.slice(0, 6), 6, 'regular', 0);
  }, [searchedRegularVideos]);

  const homeFirstShortRow = useMemo(() => {
    return fillWithPlaceholders(searchedShortVideos.slice(0, 6), 6, 'short', 0);
  }, [searchedShortVideos]);

  const homeMiddleRegular = useMemo(() => {
    return fillWithPlaceholders(searchedRegularVideos.slice(6, 9), 3, 'regular', 6);
  }, [searchedRegularVideos]);

  const homeSecondShortRow = useMemo(() => {
    return fillWithPlaceholders(searchedShortVideos.slice(6, 12), 6, 'short', 6);
  }, [searchedShortVideos]);

  const homeBottomRegular = useMemo(() => {
    return fillWithPlaceholders(searchedRegularVideos.slice(9, 15), 6, 'regular', 9);
  }, [searchedRegularVideos]);

  const isSearching = submittedSearch.trim().length > 0;

  function handleSearchSubmit(event) {
    event.preventDefault();
    setSubmittedSearch(searchInput.trim());
    setActiveMenu('Home');
  }

  function handleClearSearch() {
    setSearchInput('');
    setSubmittedSearch('');
    setActiveMenu('Home');
  }

  return (
    <div className={`home-layout ${theme === 'dark' ? 'home-layout-dark' : 'home-layout-light'}`}>
      <header className="vg-topbar">
        <div className="vg-topbar-left">
          <div className="vg-logo-box">V</div>

          <div className="vg-logo-text-wrap">
            <div className="vg-logo-text">VideoGad</div>
            <div className="vg-logo-subtext">video marketplace</div>
          </div>
        </div>

        <div className="vg-topbar-center">
          <form className="vg-search-form" onSubmit={handleSearchSubmit}>
            <div className="vg-search-shell">
              <input
                className="vg-search-input"
                type="text"
                placeholder="Search videos, products, creators"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />

              {searchInput ? (
                <button
                  type="button"
                  className="vg-search-clear"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  ×
                </button>
              ) : null}
            </div>

            <button
              type="submit"
              className="vg-search-submit"
              aria-label="Search"
            >
              🔍
            </button>
          </form>
        </div>

        <div className="vg-topbar-right">
          <button
            type="button"
            className="vg-theme-toggle"
            onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
          >
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>

          {me ? (
            <>
              <span className="vg-user-pill">{userDisplayName}</span>
              <a href="/creator-dashboard" className="vg-link-btn vg-link-btn-dark">
                Account
              </a>
            </>
          ) : (
            <>
              <a href="/login" className="vg-link-btn">
                Login
              </a>
              <a href="/register" className="vg-link-btn vg-link-btn-dark">
                Register
              </a>
            </>
          )}
        </div>
      </header>

      <div className="vg-main-shell">
        <aside className="vg-sidebar">
          {menuItems.map((item) => (
            <button
              key={item}
              type="button"
              className={`vg-sidebar-item ${activeMenu === item ? 'active' : ''}`}
              onClick={() => setActiveMenu(item)}
            >
              {item}
            </button>
          ))}
        </aside>

        <main className="vg-content">
          {errorMessage ? <div className="home-state-message error">{errorMessage}</div> : null}

          {loading ? <div className="home-state-message">Loading categories...</div> : null}

          <section className="vg-home-hero">
            <div className="vg-home-hero-left">
              <span className="vg-badge">Endpoint-first homepage</span>
              <h1>Watch product videos. Discover trusted stores. Buy smarter.</h1>
              <p className="vg-hero-subtitle">
                A creator-driven video marketplace where buyers can discover products through
                engaging videos. Categories are now connected to your real backend endpoints.
              </p>

              <div className="vg-hero-actions">
                {me ? (
                  <a href="/creator-dashboard" className="vg-primary-btn">
                    Go to Dashboard
                  </a>
                ) : (
                  <a href="/login" className="vg-primary-btn">
                    Creator Login
                  </a>
                )}

                {me ? (
                  <a href="/upload-video" className="vg-secondary-btn">
                    Upload Video
                  </a>
                ) : (
                  <a href="/register" className="vg-secondary-btn">
                    Join VideoGad
                  </a>
                )}
              </div>
            </div>

            <div className="vg-home-hero-right">
              <div className="vg-stat-card-large">
                <div className="vg-stat-top">Marketplace activity</div>
                <div className="vg-stat-big">
                  {formatCompactNumber(regularFeaturedVideos.length + onlyShortVideos.length)}
                </div>
                <div className="vg-stat-note">Videos available on the marketplace</div>
              </div>

              <div className="vg-stat-card-small">
                <div className="vg-stat-small-number">{formatCompactNumber(50000)}</div>
                <div className="vg-stat-small-label">Active viewers</div>
              </div>

              <div className="vg-stat-card-small">
                <div className="vg-stat-small-number">{formatCompactNumber(categories.length)}</div>
                <div className="vg-stat-small-label">Categories loaded</div>
              </div>

              <div className="vg-stat-card-small">
                <div className="vg-stat-small-number">
                  {formatCompactNumber(onlyShortVideos.length)}
                </div>
                <div className="vg-stat-small-label">Shorts loaded</div>
              </div>
            </div>
          </section>

          <section className="vg-categories vg-categories-single-line">
            {categoryPills.map((name) => (
              <button
                key={name}
                type="button"
                className={`vg-category-pill ${selectedCategory === name ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCategory(name);
                  setActiveMenu('Categories');
                }}
              >
                {name}
              </button>
            ))}
          </section>

          {activeMenu === 'Home' ? (
            <>
              <section className="vg-home-section-head">
                <div>
                  <h2>{isSearching ? 'Search Results' : 'Featured Videos'}</h2>
                  <p>
                    {isSearching
                      ? `Showing matches for "${submittedSearch}"`
                      : 'Live videos from the real public feed.'}
                  </p>
                </div>
              </section>

              <section className="vg-video-grid">
                {(isSearching ? searchedRegularVideos : homeTopRegular).map((video, index) => (
                  <VideoCard key={video?.id || `top-regular-${index}`} video={video} />
                ))}
              </section>

              <section className="vg-home-section-head shorts-head">
                <div>
                  <h2>{isSearching ? 'Matching Shorts' : 'Shorts'}</h2>
                  <p>
                    {isSearching
                      ? 'Short videos matching your search.'
                      : 'Real short videos from creators.'}
                  </p>
                </div>
              </section>

              <section className="vg-shorts-row vg-shorts-row-six">
                {(isSearching ? searchedShortVideos : homeFirstShortRow).map((video, index) => (
                  <ShortCard key={video?.id || `short-row-1-${index}`} video={video} />
                ))}
              </section>

              {!isSearching ? (
                <>
                  <section className="vg-video-grid vg-video-grid-three">
                    {homeMiddleRegular.map((video, index) => (
                      <VideoCard key={video?.id || `middle-regular-${index}`} video={video} />
                    ))}
                  </section>

                  <section className="vg-home-section-head shorts-head">
                    <div>
                      <h2>Shorts</h2>
                      <p>More short videos from creators.</p>
                    </div>
                  </section>

                  <section className="vg-shorts-row vg-shorts-row-six">
                    {homeSecondShortRow.map((video, index) => (
                      <ShortCard key={video?.id || `short-row-2-${index}`} video={video} />
                    ))}
                  </section>

                  <section className="vg-video-grid">
                    {homeBottomRegular.map((video, index) => (
                      <VideoCard key={video?.id || `bottom-regular-${index}`} video={video} />
                    ))}
                  </section>
                </>
              ) : null}

              {isSearching &&
              searchedRegularVideos.length === 0 &&
              searchedShortVideos.length === 0 ? (
                <div className="home-state-message">No videos matched your search.</div>
              ) : null}
            </>
          ) : (
            <>
              <section className="vg-home-section-head">
                <div>
                  <h2>{sectionTitle}</h2>
                  <p>{sectionLoading ? 'Loading...' : sectionText}</p>
                </div>
              </section>

              <section className="vg-video-grid">
                {currentVideos.length ? (
                  currentVideos.map((video, index) => (
                    <VideoCard
                      key={video?.id || video?.video_id || video?.slug || `video-${index}`}
                      video={video}
                    />
                  ))
                ) : (
                  <div className="home-state-message">
                    {me
                      ? 'No videos found for this section yet.'
                      : 'Login to use saved videos, history, and subscriptions.'}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default HomePage;