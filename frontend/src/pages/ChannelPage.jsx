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
  return params.get('slug') || 'demo-channel';
}

function getDemoChannel(slug) {
  return {
    id: 777,
    slug,
    channel_slug: slug,
    name: 'VideoGad Demo Channel',
    channel_name: 'VideoGad Demo Channel',
    description:
      'This is a demo channel profile because no real public channel data is available yet for this slug.',
    subscribers_count: 4200,
    total_views: 24800,
    total_videos: 36,
    created_at: 'Demo mode',
    isDemo: true,
  };
}

const demoChannelVideos = [
  { id: 1, title: 'Demo Channel Video One', meta: '12K views • demo content' },
  { id: 2, title: 'Demo Channel Video Two', meta: '8.4K views • demo content' },
  { id: 3, title: 'Demo Channel Video Three', meta: '5.1K views • demo content' },
  { id: 4, title: 'Demo Channel Video Four', meta: '3.7K views • demo content' },
  { id: 5, title: 'Demo Channel Video Five', meta: '9.9K views • demo content' },
  { id: 6, title: 'Demo Channel Video Six', meta: '2.8K views • demo content' },
];

function ChannelPage() {
  const [slug, setSlug] = useState(getSlugFromUrl());
  const [channelData, setChannelData] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

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
          throw new Error('Channel id not found');
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

        setIsDemoMode(false);
      } catch (error) {
        const message = error.message || '';

        if (message.toLowerCase().includes('not found')) {
          const demoChannel = getDemoChannel(slug);
          setChannelData(demoChannel);
          setSubscriptionData({ subscribed: false });
          setIsSubscribed(false);
          setIsDemoMode(true);
          setPageMessage('Demo mode is showing because no real channel exists yet.');
          setErrorMessage('');
        } else {
          setErrorMessage(message || 'Failed to load channel');
        }
      } finally {
        setLoading(false);
      }
    }

    loadChannelPage();
  }, [slug]);

  const channel = useMemo(() => {
    return channelData?.channel || channelData?.data || channelData || {};
  }, [channelData]);

  const channelId = useMemo(() => {
    return channel?.id || null;
  }, [channel]);

  async function handleSubscriptionToggle() {
    if (!channelId) return;

    if (isDemoMode) {
      setIsSubscribed((prev) => !prev);
      setPageMessage(isSubscribed ? 'Demo mode: unsubscribed.' : 'Demo mode: subscribed.');
      return;
    }

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

      try {
        const updated = await getChannelSubscription(channelId);
        setSubscriptionData(updated);
      } catch (error) {}
    } catch (error) {
      setErrorMessage(error.message || 'Failed to update subscription');
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
                {(channel?.name || channel?.channel_name || 'C').slice(0, 1).toUpperCase()}
              </div>

              <div className="channel-profile-main">
                <h1>{channel?.name || channel?.channel_name || 'Channel Name'}</h1>
                <p className="channel-handle">
                  @{channel?.channel_slug || channel?.slug || slug}
                </p>
                <p className="channel-meta-line">
                  {channel?.subscriber_count || channel?.subscribers_count || 0} subscribers • {channel?.total_videos || 0} videos • {channel?.total_views || 0} total views
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

          <p>{channel?.description || 'No channel description yet.'}</p>

          <div className="channel-about-grid">
            <div className="channel-about-box">
              <span>Created</span>
              <strong>{channel?.created_at || '—'}</strong>
            </div>

            <div className="channel-about-box">
              <span>Subscribers</span>
              <strong>{channel?.subscriber_count || channel?.subscribers_count || 0}</strong>
            </div>

            <div className="channel-about-box">
              <span>Total Videos</span>
              <strong>{channel?.total_videos || 0}</strong>
            </div>

            <div className="channel-about-box">
              <span>Total Views</span>
              <strong>{channel?.total_views || 0}</strong>
            </div>
          </div>
        </section>

        <section className="channel-videos-card">
          <div className="channel-card-head">
            <div>
              <h2>Channel Videos</h2>
              <p>Public channel videos endpoint is not available yet, so this section is demo-only for now.</p>
            </div>
          </div>

          <div className="channel-videos-grid">
            {demoChannelVideos.map((item) => (
              <div className="channel-video-card" key={item.id}>
                <div className="channel-video-thumb">Video</div>

                <div className="channel-video-info">
                  <h3>{item.title}</h3>
                  <p>{item.meta}</p>
                  <a href="/watch?slug=your-video-slug" className="channel-watch-link">
                    Open Watch Page
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default ChannelPage;