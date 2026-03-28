import React, { useEffect, useMemo, useState } from 'react';
import './ChannelPage.css';
import {
  getChannelBySlug,
  getChannelSubscription,
  subscribeToChannel,
  unsubscribeFromChannel,
} from '../services/channelService';

function getSlugFromUrl() {
  const path = window.location.pathname || '';
  const segments = path.split('/').filter(Boolean);
  const channelIndex = segments.indexOf('channel');

  if (channelIndex !== -1 && segments[channelIndex + 1]) {
    return decodeURIComponent(segments[channelIndex + 1]);
  }

  const params = new URLSearchParams(window.location.search);
  return params.get('slug') || '';
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatViewsLabel(value) {
  return `${formatNumber(value)} views`;
}

function formatVideoDate(value) {
  if (!value) return 'Recently added';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ChannelPage() {
  const [slug, setSlug] = useState(getSlugFromUrl());
  const [channelData, setChannelData] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  useEffect(() => {
    const syncSlug = () => setSlug(getSlugFromUrl());

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      originalPushState.apply(window.history, args);
      syncSlug();
    };

    window.history.replaceState = function (...args) {
      originalReplaceState.apply(window.history, args);
      syncSlug();
    };

    window.addEventListener('popstate', syncSlug);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', syncSlug);
    };
  }, []);

  useEffect(() => {
    async function loadChannelPage() {
      if (!slug) {
        setLoading(false);
        setErrorMessage('Channel slug not found.');
        return;
      }

      setLoading(true);
      setErrorMessage('');
      setPageMessage('');

      try {
        const channelResponse = await getChannelBySlug(slug);
        setChannelData(channelResponse);

        const resolvedChannel =
          channelResponse?.channel || channelResponse?.data || channelResponse || {};

        const channelId = resolvedChannel?.id;

        if (!channelId) {
          throw new Error('Channel id not found.');
        }

        try {
          const subscriptionResponse = await getChannelSubscription(channelId);
          setSubscriptionData(subscriptionResponse);

          const subscribed =
            subscriptionResponse?.subscribed === true ||
            subscriptionResponse?.is_subscribed === true ||
            subscriptionResponse?.status === 'subscribed' ||
            subscriptionResponse?.subscription_status === 'subscribed';

          setIsSubscribed(subscribed);
        } catch (error) {
          setSubscriptionData(null);
          setIsSubscribed(false);
        }
      } catch (error) {
        setChannelData(null);
        setSubscriptionData(null);
        setIsSubscribed(false);
        setErrorMessage(error.message || 'Failed to load channel.');
      } finally {
        setLoading(false);
      }
    }

    loadChannelPage();
  }, [slug]);

  const channel = useMemo(() => {
    return channelData?.channel || channelData?.data || channelData || {};
  }, [channelData]);

  const channelVideos = useMemo(() => {
    return channelData?.channel_videos || channelData?.videos || [];
  }, [channelData]);

  const channelId = channel?.id || null;
  const channelName = channel?.name || channel?.channel_name || 'Channel';
  const channelHandle = channel?.channel_handle || channel?.handle || `@${channel?.channel_slug || channel?.slug || slug}`;
  const subscribersCount =
    subscriptionData?.subscribers_count ??
    channel?.subscriber_count ??
    channel?.subscribers_count ??
    0;

  async function handleSubscriptionToggle() {
    if (!channelId) return;

    setSubscriptionLoading(true);
    setPageMessage('');
    setErrorMessage('');

    try {
      if (isSubscribed) {
        await unsubscribeFromChannel(channelId);
        setIsSubscribed(false);
        setPageMessage('Unsubscribed successfully.');
      } else {
        await subscribeToChannel(channelId);
        setIsSubscribed(true);
        setPageMessage('Subscribed successfully.');
      }

      const updated = await getChannelSubscription(channelId).catch(() => null);

      if (updated) {
        setSubscriptionData(updated);

        const subscribed =
          updated?.subscribed === true ||
          updated?.is_subscribed === true ||
          updated?.status === 'subscribed' ||
          updated?.subscription_status === 'subscribed';

        setIsSubscribed(subscribed);
      }
    } catch (error) {
      setErrorMessage(error.message || 'Failed to update subscription.');
    } finally {
      setSubscriptionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="channel-loading-page">
        <div className="channel-loading-card">Loading channel...</div>
      </div>
    );
  }

  if (errorMessage && !channelData) {
    return (
      <div className="channel-loading-page">
        <div className="channel-loading-card error">{errorMessage}</div>
      </div>
    );
  }

  return (
    <div className="channel-page">
      <div className="channel-shell">
        {errorMessage ? (
          <div className="channel-inline-message error">{errorMessage}</div>
        ) : null}

        {pageMessage ? (
          <div className="channel-inline-message success">{pageMessage}</div>
        ) : null}

        <section className="channel-banner">
          <div className="channel-banner-overlay">
            <div className="channel-profile-row">
              <div className="channel-avatar">
                {channelName.slice(0, 1).toUpperCase()}
              </div>

              <div className="channel-profile-main">
                <h1>{channelName}</h1>
                <p className="channel-handle">{channelHandle}</p>
                <p className="channel-meta-line">
                  {formatNumber(subscribersCount)} subscribers • {formatNumber(channel?.total_videos || 0)} videos • {formatNumber(channel?.total_views || 0)} total views
                </p>
              </div>

              <div className="channel-profile-actions">
                <button
                  type="button"
                  className={`channel-subscribe-btn ${isSubscribed ? 'subscribed' : ''}`}
                  onClick={handleSubscriptionToggle}
                  disabled={subscriptionLoading}
                >
                  {subscriptionLoading ? 'Please wait...' : isSubscribed ? 'Subscribed' : 'Subscribe'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="channel-about-card">
          <div className="channel-card-head">
            <h2>About Channel</h2>
          </div>

          <p>{channel?.description || channel?.bio || 'No channel description yet.'}</p>

          <div className="channel-about-grid">
            <div className="channel-about-box">
              <span>Created</span>
              <strong>{formatDate(channel?.created_at)}</strong>
            </div>

            <div className="channel-about-box">
              <span>Subscribers</span>
              <strong>{formatNumber(subscribersCount)}</strong>
            </div>

            <div className="channel-about-box">
              <span>Total Videos</span>
              <strong>{formatNumber(channel?.total_videos || 0)}</strong>
            </div>

            <div className="channel-about-box">
              <span>Total Views</span>
              <strong>{formatNumber(channel?.total_views || 0)}</strong>
            </div>
          </div>
        </section>

        <section className="channel-videos-card">
          <div className="channel-card-head">
            <div>
              <h2>Channel Videos</h2>
              <p>Published videos from this channel.</p>
            </div>
          </div>

          {channelVideos.length ? (
            <div className="channel-videos-grid">
              {channelVideos.map((video) => (
                <div className="channel-video-card" key={video.id}>
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="channel-video-thumb real"
                    />
                  ) : (
                    <div className="channel-video-thumb">Video</div>
                  )}

                  <div className="channel-video-info">
                    <h3>{video.title}</h3>
                    <p>{formatViewsLabel(video.views_count || 0)} • {formatVideoDate(video.published_at || video.created_at)}</p>
                    <a href={`/watch/${video.slug}`} className="channel-watch-link">
                      Open Watch Page
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="channel-empty-box">
              No published channel videos yet.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default ChannelPage;