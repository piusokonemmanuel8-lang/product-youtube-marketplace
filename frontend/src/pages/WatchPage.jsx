import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import {
  addVideoComment,
  addVideoReaction,
  addVideoView,
  addWatchHistory,
  getChannelSubscription,
  getRelatedVideos,
  getShareSummary,
  getVideoComments,
  getVideoReactions,
  getVideoTags,
  getWatchPageBySlug,
  recordProductClick,
  removeVideoReaction,
  saveVideo,
  shareVideo,
  subscribeToChannel,
  unsubscribeFromChannel,
  unsaveVideo,
} from '../services/watchService';
import './WatchPage.css';

function normalizeArrayResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.comments)) return data.comments;
  if (Array.isArray(data?.videos)) return data.videos;
  if (Array.isArray(data?.related)) return data.related;
  if (Array.isArray(data?.related_videos)) return data.related_videos;
  if (Array.isArray(data?.tags)) return data.tags;
  return [];
}

function getSlugFromUrl() {
  const path = window.location.pathname || '';
  const segments = path.split('/').filter(Boolean);
  const watchIndex = segments.indexOf('watch');

  if (watchIndex !== -1 && segments[watchIndex + 1]) {
    return decodeURIComponent(segments[watchIndex + 1]);
  }

  const params = new URLSearchParams(window.location.search);
  return params.get('slug') || '';
}

function formatDate(value) {
  if (!value) return 'Recently uploaded';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatViews(value) {
  const views = Number(value || 0);
  if (Number.isNaN(views)) return '0 views';
  return `${views.toLocaleString()} views`;
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

function resolveVideoFormat(video) {
  const direct = String(video?.video_format || '').toLowerCase();

  if (direct === 'short' || direct === 'regular') {
    return direct;
  }

  const duration = Number(video?.duration_seconds || 0);
  return duration > 0 && duration <= 60 ? 'short' : 'regular';
}

function getShareChoice() {
  const choice = window.prompt(
    'Share options: copy_link, whatsapp, facebook, x, telegram, email',
    'copy_link'
  );

  return (choice || 'copy_link').trim().toLowerCase();
}

function openShareLink(shareType, url, title) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title || 'VideoGad video');

  if (shareType === 'whatsapp') {
    window.open(
      `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      '_blank',
      'noopener,noreferrer'
    );
    return;
  }

  if (shareType === 'facebook') {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      '_blank',
      'noopener,noreferrer'
    );
    return;
  }

  if (shareType === 'x') {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      '_blank',
      'noopener,noreferrer'
    );
    return;
  }

  if (shareType === 'telegram') {
    window.open(
      `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      '_blank',
      'noopener,noreferrer'
    );
    return;
  }

  if (shareType === 'email') {
    window.location.href = `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
  }
}

function getCommentName(comment) {
  return (
    comment?.user?.full_name ||
    comment?.user?.username ||
    comment?.full_name ||
    comment?.username ||
    comment?.user_full_name ||
    comment?.user_username ||
    comment?.author_name ||
    comment?.name ||
    'Viewer'
  );
}

function getOrCreateAdSessionId() {
  try {
    const existing = sessionStorage.getItem('videogad_ad_session_id');
    if (existing) return existing;

    const generated =
      window.crypto?.randomUUID?.() ||
      `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    sessionStorage.setItem('videogad_ad_session_id', generated);
    return generated;
  } catch (error) {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function normalizeUrl(url) {
  const rawUrl = String(url || '').trim();

  if (!rawUrl) return '';
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;

  return `https://${rawUrl}`;
}

function getVideoThumb(item) {
  return (
    item?.short_thumbnail_url ||
    item?.short_thumbnail_key ||
    item?.thumbnail_url ||
    item?.thumbnail_key ||
    ''
  );
}

function getVideoSource(item) {
  return item?.video_url || item?.video_key || '';
}

function getChannelName(item) {
  return (
    item?.channel?.name ||
    item?.channel_name ||
    item?.channel?.channel_name ||
    item?.creator_name ||
    item?.channel?.username ||
    'Creator Channel'
  );
}

function getChannelId(item) {
  return item?.channel?.id || item?.channel_id || null;
}

function getChannelSlug(item) {
  return (
    item?.channel?.channel_slug ||
    item?.channel?.slug ||
    item?.channel?.handle ||
    item?.channel?.username ||
    ''
  );
}

function getVideoSlug(item) {
  return item?.slug || item?.video_slug || '';
}

function ShortDetailsPanel({
  video,
  watchData,
  comments,
  tags,
  reactions,
  shareSummary,
  isSaved,
  savingAction,
  reactionAction,
  shareLoading,
  buyNowLoading,
  subscribeLoading,
  isSubscribed,
  liveSubscribers,
  channel,
  channelId,
  channelSlug,
  commentText,
  setCommentText,
  commentLoading,
  handleReact,
  handleRemoveReaction,
  handleSaveToggle,
  handleShare,
  handleBuyNowClick,
  handleSubscribeToggle,
  handleCommentSubmit,
  formatDate,
  formatViews,
  formatCompactNumber,
  getCommentName,
  setShortInfoOpen,
}) {
  return (
    <div className="watch-short-panel-sheet">
      <div className="watch-short-panel-head">
        <div className="watch-short-panel-head-top">
          <div className="watch-short-badge">Short</div>

          <button
            type="button"
            className="watch-short-close-btn"
            onClick={() => setShortInfoOpen(false)}
          >
            Close
          </button>
        </div>

        <h1 className="watch-short-title">{video?.title || 'Untitled Video'}</h1>

        <div className="watch-short-meta">
          <span>
            {formatViews(
              watchData?.metrics?.total_views ?? video?.views_count ?? video?.views
            )}
          </span>
          <span>{formatDate(video?.published_at || video?.created_at)}</span>
        </div>
      </div>

      <div className="watch-short-action-row">
        <button
          type="button"
          className="watch-action-btn"
          onClick={() => handleReact('like')}
          disabled={reactionAction}
        >
          Like {reactions?.likes_count ?? reactions?.likes ?? 0}
        </button>

        <button
          type="button"
          className="watch-action-btn"
          onClick={() => handleReact('dislike')}
          disabled={reactionAction}
        >
          Dislike {reactions?.dislikes_count ?? reactions?.dislikes ?? 0}
        </button>

        <button
          type="button"
          className="watch-action-btn"
          onClick={handleRemoveReaction}
          disabled={reactionAction}
        >
          Remove Reaction
        </button>

        <button
          type="button"
          className="watch-action-btn"
          onClick={handleSaveToggle}
          disabled={savingAction}
        >
          {isSaved ? 'Unsave' : 'Save'}
        </button>

        <button
          type="button"
          className="watch-action-btn"
          onClick={handleShare}
          disabled={shareLoading}
        >
          Share {shareSummary?.total_shares ?? shareSummary?.shares ?? 0}
        </button>
      </div>

      <div className="watch-short-creator-bar">
        <div className="watch-creator-left">
          <div className="watch-avatar">
            {(channel?.name || channel?.channel_name || 'C').slice(0, 1).toUpperCase()}
          </div>

          <div>
            <h3 className="watch-creator-name">
              {channel?.name || channel?.channel_name || 'Creator Channel'}
            </h3>
            <p className="watch-creator-subs">
              {formatCompactNumber(liveSubscribers)} subscribers
            </p>
          </div>
        </div>

        <div className="watch-short-creator-buttons">
          <button
            type="button"
            className="watch-subscribe-btn"
            onClick={handleSubscribeToggle}
            disabled={subscribeLoading || !channelId}
          >
            {subscribeLoading ? 'Please wait...' : isSubscribed ? 'Subscribed' : 'Subscribe'}
          </button>

          <a
            href={channelSlug ? `/channel/${channelSlug}` : '/channel'}
            className="watch-subscribe-btn secondary"
          >
            Visit Channel
          </a>
        </div>
      </div>

      <div className="watch-short-desc">
        <h3>Description</h3>
        <p>{video?.description || 'No description available yet.'}</p>

        {tags.length ? (
          <div className="watch-tags-wrap">
            {tags.map((tag, index) => {
              const name = tag?.name || tag?.title || tag?.tag || `Tag ${index + 1}`;
              return (
                <span className="watch-tag-pill" key={`${name}-${index}`}>
                  {name}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="watch-short-comments">
        <h3>Comments ({comments.length})</h3>

        <form className="watch-comment-input" onSubmit={handleCommentSubmit}>
          <input
            type="text"
            placeholder="Write a comment"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <button type="submit" disabled={commentLoading}>
            {commentLoading ? 'Posting...' : 'Comment'}
          </button>
        </form>

        <div className="watch-comments-list">
          {comments.length ? (
            comments.slice(0, 6).map((comment, index) => {
              const commentName = getCommentName(comment);
              const content =
                comment?.comment_text ||
                comment?.content ||
                comment?.comment ||
                comment?.body ||
                'No comment text';

              return (
                <div className="watch-comment-item" key={comment?.id || index}>
                  <div className="watch-comment-avatar">
                    {commentName.slice(0, 1).toUpperCase()}
                  </div>

                  <div>
                    <p className="watch-comment-name">
                      {commentName}
                      <span>{formatDate(comment?.created_at || comment?.date || 'Just now')}</span>
                    </p>
                    <p className="watch-comment-text">{content}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="watch-related-empty">No comments yet.</div>
          )}
        </div>
      </div>

      <div className="watch-short-panel-footer">
        <a
          className="watch-buy-btn watch-short-buy-btn-full"
          href={normalizeUrl(video?.buy_link || video?.buy_now_url || '#') || '#'}
          target="_blank"
          rel="noreferrer"
          onClick={handleBuyNowClick}
          aria-disabled={buyNowLoading}
        >
          {buyNowLoading ? 'Opening...' : 'Buy Now'}
        </a>
      </div>
    </div>
  );
}

function WatchPage() {
  const [slug, setSlug] = useState(getSlugFromUrl());
  const [watchData, setWatchData] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [featuredAds, setFeaturedAds] = useState([]);
  const [comments, setComments] = useState([]);
  const [tags, setTags] = useState([]);
  const [reactions, setReactions] = useState(null);
  const [shareSummary, setShareSummary] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [savingAction, setSavingAction] = useState(false);
  const [reactionAction, setReactionAction] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [channelSubscriptionData, setChannelSubscriptionData] = useState(null);

  const [adData, setAdData] = useState(null);
  const [showPrerollAd, setShowPrerollAd] = useState(false);
  const [adCountdown, setAdCountdown] = useState(3);
  const [skipReady, setSkipReady] = useState(false);
  const [adLoading, setAdLoading] = useState(false);

  const [shortInfoOpen, setShortInfoOpen] = useState(false);
  const [activeShortIndex, setActiveShortIndex] = useState(0);

  const videoRef = useRef(null);
  const adVideoRef = useRef(null);
  const adCountdownIntervalRef = useRef(null);
  const adEndedRef = useRef(false);
  const adImpressionTrackedRef = useRef(false);
  const adImpressionIdRef = useRef(null);
  const shortsFeedRef = useRef(null);

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

  const video = useMemo(() => {
    return watchData?.video || watchData?.data || watchData || {};
  }, [watchData]);

  const videoId = useMemo(() => {
    return video?.id || watchData?.id || watchData?.data?.id || null;
  }, [video, watchData]);

  const channel = useMemo(() => {
    return watchData?.channel || video?.channel || {};
  }, [watchData, video]);

  const channelId = useMemo(() => {
    return channel?.id || video?.channel_id || null;
  }, [channel, video]);

  const channelSlug = useMemo(() => {
    return (
      channel?.channel_slug ||
      channel?.slug ||
      channel?.handle ||
      channel?.username ||
      ''
    );
  }, [channel]);

  const isShortVideo = useMemo(() => resolveVideoFormat(video) === 'short', [video]);

  const liveSubscribers =
    channelSubscriptionData?.subscribers_count ??
    channel?.subscriber_count ??
    channel?.subscribers_count ??
    channel?.subscribers ??
    0;

  const shortThumb = useMemo(() => getVideoThumb(video), [video]);

  const shortFeed = useMemo(() => {
    if (!isShortVideo) return [];

    const currentItem = {
      ...video,
      id: video?.id || watchData?.id || 'current-short',
      slug: getVideoSlug(video) || slug,
      channel: channel,
      isCurrentWatchItem: true,
      __sourceIndex: 0,
    };

    const extraShorts = relatedVideos
      .filter((item) => resolveVideoFormat(item) === 'short')
      .filter((item) => String(item?.id || item?.video_id || '') !== String(video?.id || ''))
      .map((item, index) => ({
        ...item,
        __sourceIndex: index + 1,
      }));

    return [currentItem, ...extraShorts];
  }, [isShortVideo, video, relatedVideos, channel, watchData, slug]);

  useEffect(() => {
    return () => {
      if (adCountdownIntervalRef.current) {
        clearInterval(adCountdownIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    async function loadWatchPage() {
      if (!slug) {
        setLoading(false);
        setErrorMessage('Video slug not found.');
        return;
      }

      setLoading(true);
      setErrorMessage('');
      setPageMessage('');
      setAdData(null);
      setShowPrerollAd(false);
      setSkipReady(false);
      setAdCountdown(3);
      setShortInfoOpen(false);
      setActiveShortIndex(0);
      adEndedRef.current = false;
      adImpressionTrackedRef.current = false;
      adImpressionIdRef.current = null;

      if (adCountdownIntervalRef.current) {
        clearInterval(adCountdownIntervalRef.current);
      }

      try {
        const watchResponse = await getWatchPageBySlug(slug);

        const resolvedVideo =
          watchResponse?.video || watchResponse?.data || watchResponse || {};

        const resolvedVideoId =
          resolvedVideo?.id ||
          watchResponse?.id ||
          watchResponse?.data?.id;

        if (!resolvedVideoId) {
          throw new Error('Video id not found in watch response');
        }

        const resolvedChannel =
          watchResponse?.channel || resolvedVideo?.channel || {};

        const resolvedChannelId =
          resolvedChannel?.id || resolvedVideo?.channel_id || null;

        const oldViewCount =
          watchResponse?.metrics?.total_views ??
          resolvedVideo?.views_count ??
          resolvedVideo?.views ??
          0;

        let viewResponse = null;

        try {
          viewResponse = await addVideoView(resolvedVideoId);
        } catch (error) {
          viewResponse = null;
        }

        await addWatchHistory(resolvedVideoId).catch(() => null);

        const [
          relatedResponse,
          commentsResponse,
          tagsResponse,
          reactionsResponse,
          shareSummaryResponse,
          subscriptionResponse,
          featuredAdsResponse,
        ] = await Promise.all([
          getRelatedVideos(resolvedVideoId).catch(() => []),
          getVideoComments(resolvedVideoId).catch(() => []),
          getVideoTags(resolvedVideoId).catch(() => []),
          getVideoReactions(resolvedVideoId).catch(() => null),
          getShareSummary(resolvedVideoId).catch(() => null),
          resolvedChannelId
            ? getChannelSubscription(resolvedChannelId).catch(() => null)
            : Promise.resolve(null),
          api.request('/ads/featured?limit=10').catch(() => ({ featured_ads: [] })),
        ]);

        const newViewCount =
          viewResponse?.metrics?.total_views ??
          viewResponse?.total_views ??
          viewResponse?.views_count ??
          viewResponse?.views ??
          Number(oldViewCount) + 1;

        setWatchData({
          ...watchResponse,
          video: {
            ...resolvedVideo,
            views_count: newViewCount,
            views: newViewCount,
          },
          metrics: {
            ...(watchResponse?.metrics || {}),
            total_views: newViewCount,
          },
        });

        setRelatedVideos(normalizeArrayResponse(relatedResponse));
        setFeaturedAds(
          Array.isArray(featuredAdsResponse?.featured_ads)
            ? featuredAdsResponse.featured_ads.slice(0, 10)
            : []
        );
        setComments(normalizeArrayResponse(commentsResponse));
        setTags(normalizeArrayResponse(tagsResponse));
        setReactions(reactionsResponse || null);
        setShareSummary(shareSummaryResponse || null);
        setChannelSubscriptionData(subscriptionResponse || null);

        const subscribed =
          subscriptionResponse?.subscribed === true ||
          subscriptionResponse?.is_subscribed === true ||
          subscriptionResponse?.status === 'subscribed' ||
          subscriptionResponse?.subscription_status === 'subscribed';

        setIsSubscribed(subscribed);

        const savedFlag =
          watchResponse?.saved === true ||
          resolvedVideo?.saved === true ||
          watchResponse?.is_saved === true ||
          watchResponse?.saved_video === true;

        setIsSaved(savedFlag);

        try {
          setAdLoading(true);

          const sessionId = getOrCreateAdSessionId();
          const adResponse = await api.request(
            `/ads/player?video_id=${encodeURIComponent(
              resolvedVideoId
            )}&break_type=pre-roll&session_id=${encodeURIComponent(sessionId)}`
          );

          const fetchedAd = adResponse?.ad || null;
          const skipAfterSeconds = Math.max(
            Number(fetchedAd?.skip_after_seconds || 3),
            3
          );

          if (fetchedAd?.ad_video_id && fetchedAd?.video_key) {
            setAdData({
              ...fetchedAd,
              skip_after_seconds: skipAfterSeconds,
              viewer_video_id: resolvedVideoId,
              session_id: sessionId,
            });
            setAdCountdown(skipAfterSeconds);
            setSkipReady(false);
            setShowPrerollAd(true);
          } else {
            setAdData(null);
            setShowPrerollAd(false);
          }
        } catch (adError) {
          setAdData(null);
          setShowPrerollAd(false);
        } finally {
          setAdLoading(false);
        }
      } catch (error) {
        setWatchData(null);
        setRelatedVideos([]);
        setFeaturedAds([]);
        setComments([]);
        setTags([]);
        setReactions(null);
        setShareSummary(null);
        setChannelSubscriptionData(null);
        setIsSubscribed(false);
        setIsSaved(false);
        setAdData(null);
        setShowPrerollAd(false);
        setErrorMessage(error.message || 'Failed to load watch page');
      } finally {
        setLoading(false);
      }
    }

    loadWatchPage();
  }, [slug]);

  useEffect(() => {
    if (!isShortVideo || !shortsFeedRef.current) return;

    const container = shortsFeedRef.current;
    const handleScroll = () => {
      const slides = Array.from(container.querySelectorAll('.watch-short-slide'));
      if (!slides.length) return;

      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      slides.forEach((slide, index) => {
        const distance = Math.abs(slide.offsetTop - container.scrollTop);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveShortIndex(closestIndex);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [isShortVideo, shortFeed.length]);

  useEffect(() => {
    setShortInfoOpen(false);
  }, [activeShortIndex, slug]);

  useEffect(() => {
    if (!showPrerollAd || !adData?.ad_video_id) {
      if (adCountdownIntervalRef.current) {
        clearInterval(adCountdownIntervalRef.current);
      }
      return;
    }

    if (!adImpressionTrackedRef.current) {
      adImpressionTrackedRef.current = true;

      api
        .request('/ads/impressions', {
          method: 'POST',
          body: {
            campaign_id: adData.campaign_id,
            ad_video_id: adData.ad_video_id,
            video_id: adData.viewer_video_id,
            break_type: 'pre-roll',
            session_id: adData.session_id,
          },
        })
        .then((response) => {
          const impressionId =
            response?.impression?.id ||
            response?.data?.impression?.id ||
            response?.id ||
            null;

          adImpressionIdRef.current = impressionId;
        })
        .catch(() => null);
    }

    setSkipReady(false);
    setAdCountdown(Math.max(Number(adData.skip_after_seconds || 3), 3));

    adCountdownIntervalRef.current = setInterval(() => {
      setAdCountdown((current) => {
        if (current <= 1) {
          clearInterval(adCountdownIntervalRef.current);
          setSkipReady(true);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      if (adCountdownIntervalRef.current) {
        clearInterval(adCountdownIntervalRef.current);
      }
    };
  }, [showPrerollAd, adData]);

  useEffect(() => {
    if (!videoRef.current || !video?.video_url || showPrerollAd || !isShortVideo) return;

    const playVideo = async () => {
      try {
        videoRef.current.muted = false;
        videoRef.current.defaultMuted = false;
        videoRef.current.volume = 1;
        await videoRef.current.play();
      } catch (error) {}
    };

    playVideo();
  }, [watchData, video?.video_url, showPrerollAd, isShortVideo]);

  useEffect(() => {
    if (!adVideoRef.current || !showPrerollAd || !adData?.video_key) return;

    const playAdVideo = async () => {
      try {
        const player = adVideoRef.current;
        player.muted = true;
        player.defaultMuted = true;
        player.volume = 0;
        await player.play();
      } catch (error) {}
    };

    playAdVideo();
  }, [showPrerollAd, adData]);

  function finishAdPlayback() {
    if (adEndedRef.current) return;
    adEndedRef.current = true;

    if (adCountdownIntervalRef.current) {
      clearInterval(adCountdownIntervalRef.current);
    }

    setShowPrerollAd(false);
    setSkipReady(false);
    setAdCountdown(0);
    adImpressionTrackedRef.current = false;
    adImpressionIdRef.current = null;
  }

  async function handleSkipAd() {
    const impressionId = adImpressionIdRef.current;
    const watchedSeconds = adVideoRef.current
      ? Math.floor(Number(adVideoRef.current.currentTime || 0))
      : 0;

    if (!impressionId) {
      finishAdPlayback();
      return;
    }

    try {
      await api.request('/ads/skips', {
        method: 'POST',
        body: {
          impression_id: impressionId,
          watched_seconds: watchedSeconds,
        },
      });
    } catch (error) {}

    finishAdPlayback();
  }

  async function handleAdClick() {
    if (!adData?.ad_video_id || !adData?.destination_url) return;

    try {
      await api.request('/ads/clicks', {
        method: 'POST',
        body: {
          campaign_id: adData.campaign_id,
          ad_video_id: adData.ad_video_id,
          video_id: adData.viewer_video_id,
          session_id: adData.session_id,
          destination_url: adData.destination_url,
        },
      });
    } catch (error) {}

    const finalUrl = normalizeUrl(adData.destination_url);
    if (!finalUrl) return;

    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleFeaturedAdClick(ad) {
    const finalUrl = normalizeUrl(ad?.destination_url);
    if (!finalUrl) return;

    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleReact(type) {
    if (!videoId) return;

    setReactionAction(true);
    setPageMessage('');
    setErrorMessage('');

    try {
      await addVideoReaction(videoId, { reaction_type: type });
      const updated = await getVideoReactions(videoId);
      setReactions(updated || null);
      setPageMessage(`${type} reaction added.`);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to react');
    } finally {
      setReactionAction(false);
    }
  }

  async function handleRemoveReaction() {
    if (!videoId) return;

    setReactionAction(true);
    setPageMessage('');
    setErrorMessage('');

    try {
      await removeVideoReaction(videoId);
      const updated = await getVideoReactions(videoId).catch(() => null);
      setReactions(updated || null);
      setPageMessage('Reaction removed.');
    } catch (error) {
      setErrorMessage(error.message || 'Failed to remove reaction');
    } finally {
      setReactionAction(false);
    }
  }

  async function handleSaveToggle() {
    if (!videoId) return;

    setSavingAction(true);
    setPageMessage('');
    setErrorMessage('');

    try {
      if (isSaved) {
        await unsaveVideo(videoId);
        setIsSaved(false);
        setPageMessage('Video removed from saved.');
      } else {
        await saveVideo(videoId);
        setIsSaved(true);
        setPageMessage('Video saved.');
      }
    } catch (error) {
      setErrorMessage(error.message || 'Failed to update saved state');
    } finally {
      setSavingAction(false);
    }
  }

  async function handleShare() {
    if (!videoId) return;

    setShareLoading(true);
    setPageMessage('');
    setErrorMessage('');

    try {
      const url = window.location.href;
      const title = video?.title || 'VideoGad video';

      if (navigator.share) {
        await navigator.share({
          title,
          text: title,
          url,
        });

        await shareVideo(videoId, { share_type: 'native' }).catch(() =>
          shareVideo(videoId, { share_type: 'copy_link' })
        );
      } else {
        const choice = getShareChoice();

        if (choice === 'copy_link') {
          await navigator.clipboard.writeText(url).catch(() => {});
        } else {
          openShareLink(choice, url, title);
        }

        await shareVideo(videoId, { share_type: choice || 'copy_link' }).catch(() =>
          shareVideo(videoId, { share_type: 'copy_link' })
        );
      }

      const summary = await getShareSummary(videoId).catch(() => null);
      setShareSummary(summary || null);
      setPageMessage('Share completed.');
    } catch (error) {
      setErrorMessage(error.message || 'Failed to share video');
    } finally {
      setShareLoading(false);
    }
  }

  async function handleBuyNowClick(event, targetVideo = null) {
    event.preventDefault();

    const currentVideo = targetVideo || video;
    const currentVideoId = currentVideo?.id || currentVideo?.video_id || videoId;
    const destinationUrl = currentVideo?.buy_link || currentVideo?.buy_now_url || '';

    if (!currentVideoId || !destinationUrl || destinationUrl === '#') {
      setErrorMessage('Buy now link is not available.');
      return;
    }

    if (!targetVideo || currentVideoId === videoId) {
      setBuyNowLoading(true);
    }

    setPageMessage('');
    setErrorMessage('');

    try {
      await recordProductClick(currentVideoId, {
        destination_url: destinationUrl,
      });
    } catch (error) {
    } finally {
      if (!targetVideo || currentVideoId === videoId) {
        setBuyNowLoading(false);
      }
    }

    const finalUrl = normalizeUrl(destinationUrl);
    if (!finalUrl) return;

    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleSubscribeToggle() {
    if (!channelId) return;

    setSubscribeLoading(true);
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
        setChannelSubscriptionData(updated);

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
      setSubscribeLoading(false);
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();
    if (!videoId || !commentText.trim()) return;

    setCommentLoading(true);
    setPageMessage('');
    setErrorMessage('');

    try {
      await addVideoComment(videoId, {
        comment_text: commentText.trim(),
      });

      const updatedComments = await getVideoComments(videoId);
      setComments(normalizeArrayResponse(updatedComments));
      setCommentText('');
      setPageMessage('Comment added.');
    } catch (error) {
      setErrorMessage(error.message || 'Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  }

  async function handleRelatedVideoClick(event, relatedVideoId, relatedSlug) {
    if (!relatedSlug) return;

    event.preventDefault();

    try {
      if (relatedVideoId) {
        await addVideoView(relatedVideoId).catch(() => null);
        await addWatchHistory(relatedVideoId).catch(() => null);
      }
    } catch (error) {}

    window.location.href = `/watch/${relatedSlug}`;
  }

  if (loading) {
    return (
      <div className="watch-loading-page">
        <div className="watch-loading-card">Loading watch page...</div>
      </div>
    );
  }

  if (errorMessage && !watchData) {
    return (
      <div className="watch-loading-page">
        <div className="watch-loading-card error">{errorMessage}</div>
      </div>
    );
  }

  return (
    <div className={`watch-page ${isShortVideo ? 'watch-page-short' : ''}`}>
      {isShortVideo ? (
        <div className="watch-short-feed-shell">
          {errorMessage ? (
            <div className="watch-inline-message error watch-short-top-message">
              {errorMessage}
            </div>
          ) : null}

          {pageMessage ? (
            <div className="watch-inline-message success watch-short-top-message">
              {pageMessage}
            </div>
          ) : null}

          <div className="watch-short-feed" ref={shortsFeedRef}>
            {shortFeed.map((item, index) => {
              const itemThumb = getVideoThumb(item);
              const itemSource = getVideoSource(item);
              const itemSlug = getVideoSlug(item);
              const itemChannelName = getChannelName(item);
              const itemIsCurrent = item?.isCurrentWatchItem === true;
              const isActiveSlide = activeShortIndex === index;
              const itemViews = item?.isCurrentWatchItem
                ? watchData?.metrics?.total_views ?? item?.views_count ?? item?.views
                : item?.views_count ?? item?.views ?? 0;

              return (
                <section
                  className="watch-short-slide"
                  key={`${item?.id || item?.video_id || 'short'}-${index}`}
                >
                  <div className="watch-short-stage">
                    <div className="watch-short-player-box watch-short-player-box-full">
                      {itemIsCurrent && showPrerollAd && adData?.video_key ? (
                        <>
                          <video
                            key={adData.ad_video_id}
                            ref={adVideoRef}
                            className="watch-short-video"
                            controls
                            autoPlay
                            muted
                            playsInline
                            preload="auto"
                            src={adData.video_key}
                            poster={adData.thumbnail_key || itemThumb || ''}
                            onEnded={finishAdPlayback}
                          />

                          <div className="watch-short-ad-top-left">Sponsored Ad</div>

                          <div className="watch-short-ad-top-right">
                            {!skipReady ? (
                              <div className="watch-short-ad-pill">Skip in {adCountdown}s</div>
                            ) : (
                              <button
                                type="button"
                                onClick={handleSkipAd}
                                className="watch-short-ad-skip-btn"
                              >
                                Skip Ad
                              </button>
                            )}
                          </div>

                          <div className="watch-short-ad-bottom-left">
                            {adData?.campaign_title ? (
                              <div className="watch-short-ad-pill">
                                {adData.campaign_title}
                              </div>
                            ) : null}

                            {adData?.destination_url ? (
                              <button
                                type="button"
                                onClick={handleAdClick}
                                className="watch-short-ad-visit-btn"
                              >
                                Visit Advertiser
                              </button>
                            ) : null}
                          </div>
                        </>
                      ) : itemSource ? (
                        <video
                          ref={itemIsCurrent ? videoRef : undefined}
                          className="watch-short-video"
                          controls={itemIsCurrent}
                          autoPlay={isActiveSlide}
                          muted={!itemIsCurrent}
                          playsInline
                          preload="metadata"
                          loop={!itemIsCurrent}
                          src={itemSource}
                          poster={itemThumb}
                          onLoadedMetadata={() => {
                            if (!itemIsCurrent || !videoRef.current) return;
                            videoRef.current.muted = false;
                            videoRef.current.defaultMuted = false;
                            videoRef.current.volume = 1;
                            videoRef.current.play().catch(() => {});
                          }}
                          onCanPlay={() => {
                            if (!itemIsCurrent || !videoRef.current) return;
                            videoRef.current.muted = false;
                            videoRef.current.defaultMuted = false;
                            videoRef.current.volume = 1;
                            videoRef.current.play().catch(() => {});
                          }}
                        />
                      ) : itemThumb ? (
                        <div
                          className="watch-short-empty has-poster"
                          style={{ backgroundImage: `url(${itemThumb})` }}
                        />
                      ) : (
                        <div className="watch-short-empty">
                          {adLoading && itemIsCurrent ? 'Loading ad...' : 'Short Video'}
                        </div>
                      )}

                      <div className="watch-short-duration">
                        {formatShortDuration(item?.duration_seconds)}
                      </div>

                      <div className="watch-short-bottom-dock">
                        <a
                          className="watch-buy-btn watch-short-buy-btn"
                          href={normalizeUrl(item?.buy_link || item?.buy_now_url || '#') || '#'}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => handleBuyNowClick(event, item)}
                          aria-disabled={buyNowLoading && itemIsCurrent}
                        >
                          {buyNowLoading && itemIsCurrent ? 'Opening...' : 'Buy Now'}
                        </a>

                        <button
                          type="button"
                          className="watch-short-toggle-btn"
                          onClick={() => {
                            if (!itemIsCurrent && itemSlug) {
                              window.location.href = `/watch/${itemSlug}`;
                              return;
                            }
                            setShortInfoOpen((prev) => !prev);
                          }}
                        >
                          {itemIsCurrent
                            ? shortInfoOpen
                              ? 'Hide details'
                              : 'Show details'
                            : 'Open short'}
                        </button>
                      </div>

                      <div className="watch-short-overlay-meta">
                        <div className="watch-short-badge">Short</div>
                        <h2>{item?.title || 'Untitled Video'}</h2>
                        <p>
                          {formatViews(itemViews)} • {formatDate(item?.published_at || item?.created_at)}
                        </p>
                        <span>{itemChannelName}</span>
                      </div>
                    </div>

                    {itemIsCurrent && shortInfoOpen ? (
                      <div className="watch-short-panel-open">
                        <ShortDetailsPanel
                          video={video}
                          watchData={watchData}
                          comments={comments}
                          tags={tags}
                          reactions={reactions}
                          shareSummary={shareSummary}
                          isSaved={isSaved}
                          savingAction={savingAction}
                          reactionAction={reactionAction}
                          shareLoading={shareLoading}
                          buyNowLoading={buyNowLoading}
                          subscribeLoading={subscribeLoading}
                          isSubscribed={isSubscribed}
                          liveSubscribers={liveSubscribers}
                          channel={channel}
                          channelId={channelId}
                          channelSlug={channelSlug}
                          commentText={commentText}
                          setCommentText={setCommentText}
                          commentLoading={commentLoading}
                          handleReact={handleReact}
                          handleRemoveReaction={handleRemoveReaction}
                          handleSaveToggle={handleSaveToggle}
                          handleShare={handleShare}
                          handleBuyNowClick={handleBuyNowClick}
                          handleSubscribeToggle={handleSubscribeToggle}
                          handleCommentSubmit={handleCommentSubmit}
                          formatDate={formatDate}
                          formatViews={formatViews}
                          formatCompactNumber={formatCompactNumber}
                          getCommentName={getCommentName}
                          setShortInfoOpen={setShortInfoOpen}
                        />
                      </div>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="watch-layout">
          <main className="watch-main">
            <div className="watch-player" style={{ position: 'relative' }}>
              {showPrerollAd && adData?.video_key ? (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    background: '#000',
                    borderRadius: 16,
                    overflow: 'hidden',
                  }}
                >
                  <video
                    key={adData.ad_video_id}
                    ref={adVideoRef}
                    className="watch-real-video"
                    controls
                    autoPlay
                    muted
                    playsInline
                    preload="auto"
                    src={adData.video_key}
                    poster={adData.thumbnail_key || ''}
                    onEnded={finishAdPlayback}
                  />

                  <div
                    style={{
                      position: 'absolute',
                      top: 14,
                      left: 14,
                      background: 'rgba(0,0,0,0.72)',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Sponsored Ad
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                    }}
                  >
                    {!skipReady ? (
                      <div
                        style={{
                          background: 'rgba(0,0,0,0.72)',
                          color: '#fff',
                          padding: '8px 12px',
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        Skip in {adCountdown}s
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSkipAd}
                        style={{
                          background: '#fff',
                          color: '#111',
                          border: 'none',
                          padding: '10px 14px',
                          borderRadius: 999,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Skip Ad
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      left: 14,
                      bottom: 14,
                      display: 'flex',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    {adData?.campaign_title ? (
                      <div
                        style={{
                          background: 'rgba(0,0,0,0.72)',
                          color: '#fff',
                          padding: '8px 12px',
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {adData.campaign_title}
                      </div>
                    ) : null}

                    {adData?.destination_url ? (
                      <button
                        type="button"
                        onClick={handleAdClick}
                        style={{
                          background: '#ff2d55',
                          color: '#fff',
                          border: 'none',
                          padding: '10px 14px',
                          borderRadius: 999,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Visit Advertiser
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : video?.video_url ? (
                <video
                  ref={videoRef}
                  className="watch-real-video"
                  controls
                  autoPlay
                  playsInline
                  preload="auto"
                  src={video.video_url}
                  poster={video?.thumbnail_url || ''}
                  onLoadedMetadata={() => {
                    if (!videoRef.current) return;
                    videoRef.current.muted = false;
                    videoRef.current.defaultMuted = false;
                    videoRef.current.volume = 1;
                    videoRef.current.play().catch(() => {});
                  }}
                  onCanPlay={() => {
                    if (!videoRef.current) return;
                    videoRef.current.muted = false;
                    videoRef.current.defaultMuted = false;
                    videoRef.current.volume = 1;
                    videoRef.current.play().catch(() => {});
                  }}
                />
              ) : (
                <div className="watch-player-screen">
                  {adLoading ? 'Loading ad...' : 'Video Player Placeholder'}
                </div>
              )}
            </div>

            {errorMessage ? (
              <div className="watch-inline-message error">{errorMessage}</div>
            ) : null}

            {pageMessage ? (
              <div className="watch-inline-message success">{pageMessage}</div>
            ) : null}

            <section className="watch-details-card">
              <h1 className="watch-title">{video?.title || 'Untitled Video'}</h1>

              <div className="watch-meta-row">
                <div>
                  <div className="watch-meta-main">
                    {formatViews(
                      watchData?.metrics?.total_views ??
                        video?.views_count ??
                        video?.views
                    )}
                  </div>
                  <div className="watch-meta-sub">
                    {formatDate(video?.published_at || video?.created_at)}
                  </div>
                </div>

                <div className="watch-action-row">
                  <button
                    type="button"
                    className="watch-action-btn"
                    onClick={() => handleReact('like')}
                    disabled={reactionAction}
                  >
                    Like {reactions?.likes_count ?? reactions?.likes ?? 0}
                  </button>

                  <button
                    type="button"
                    className="watch-action-btn"
                    onClick={() => handleReact('dislike')}
                    disabled={reactionAction}
                  >
                    Dislike {reactions?.dislikes_count ?? reactions?.dislikes ?? 0}
                  </button>

                  <button
                    type="button"
                    className="watch-action-btn"
                    onClick={handleRemoveReaction}
                    disabled={reactionAction}
                  >
                    Remove Reaction
                  </button>

                  <button
                    type="button"
                    className="watch-action-btn"
                    onClick={handleSaveToggle}
                    disabled={savingAction}
                  >
                    {isSaved ? 'Unsave' : 'Save'}
                  </button>

                  <button
                    type="button"
                    className="watch-action-btn"
                    onClick={handleShare}
                    disabled={shareLoading}
                  >
                    Share {shareSummary?.total_shares ?? shareSummary?.shares ?? 0}
                  </button>

                  <a
                    className="watch-buy-btn"
                    href={normalizeUrl(video?.buy_link || video?.buy_now_url || '#') || '#'}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => handleBuyNowClick(event, video)}
                    aria-disabled={buyNowLoading}
                  >
                    {buyNowLoading ? 'Opening...' : 'Buy Now'}
                  </a>
                </div>
              </div>
            </section>

            <section className="watch-creator-card">
              <div className="watch-creator-left">
                <div className="watch-avatar">
                  {(channel?.name || channel?.channel_name || 'C').slice(0, 1).toUpperCase()}
                </div>

                <div>
                  <h3 className="watch-creator-name">
                    {channel?.name || channel?.channel_name || 'Creator Channel'}
                  </h3>
                  <p className="watch-creator-subs">
                    {Number(liveSubscribers).toLocaleString()} subscribers
                  </p>
                </div>
              </div>

              <div className="watch-creator-actions">
                <button
                  type="button"
                  className="watch-subscribe-btn"
                  onClick={handleSubscribeToggle}
                  disabled={subscribeLoading || !channelId}
                >
                  {subscribeLoading ? 'Please wait...' : isSubscribed ? 'Subscribed' : 'Subscribe'}
                </button>

                <a
                  href={channelSlug ? `/channel/${channelSlug}` : '/channel'}
                  className="watch-subscribe-btn secondary"
                >
                  Visit Channel
                </a>
              </div>
            </section>

            <section className="watch-description-card">
              <h3>Description</h3>
              <p>{video?.description || 'No description available yet.'}</p>

              {tags.length ? (
                <div className="watch-tags-wrap">
                  {tags.map((tag, index) => {
                    const name =
                      tag?.name ||
                      tag?.title ||
                      tag?.tag ||
                      `Tag ${index + 1}`;

                    return (
                      <span className="watch-tag-pill" key={`${name}-${index}`}>
                        {name}
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </section>

            <section className="watch-comments-card">
              <h3>Comments ({comments.length})</h3>

              <form className="watch-comment-input" onSubmit={handleCommentSubmit}>
                <input
                  type="text"
                  placeholder="Write a comment"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <button type="submit" disabled={commentLoading}>
                  {commentLoading ? 'Posting...' : 'Comment'}
                </button>
              </form>

              <div className="watch-comments-list">
                {comments.length ? (
                  comments.map((comment, index) => {
                    const commentName = getCommentName(comment);

                    const content =
                      comment?.comment_text ||
                      comment?.content ||
                      comment?.comment ||
                      comment?.body ||
                      'No comment text';

                    return (
                      <div className="watch-comment-item" key={comment?.id || index}>
                        <div className="watch-comment-avatar">
                          {commentName.slice(0, 1).toUpperCase()}
                        </div>

                        <div>
                          <p className="watch-comment-name">
                            {commentName}
                            <span>{formatDate(comment?.created_at || comment?.date || 'Just now')}</span>
                          </p>
                          <p className="watch-comment-text">{content}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="watch-related-empty">No comments yet.</div>
                )}
              </div>
            </section>
          </main>

          <aside className="watch-sidebar">
            <section className="watch-sidebar-block">
              <h3 className="watch-sidebar-title">Featured Ads</h3>

              <div className="watch-related-list">
                {featuredAds.length ? (
                  featuredAds.map((item, index) => {
                    const title = item?.ad_title || item?.campaign_title || `Featured Ad ${index + 1}`;
                    const campaignTitle = item?.campaign_title || 'Sponsored';
                    const impressions = Number(item?.total_impressions || 0);
                    const thumb = item?.thumbnail_key || '';

                    return (
                      <button
                        type="button"
                        className="watch-related-item watch-featured-ad-item"
                        key={`${item?.campaign_id || 'campaign'}-${item?.ad_video_id || index}`}
                        onClick={() => handleFeaturedAdClick(item)}
                      >
                        <div
                          className={`watch-related-thumb ${thumb ? 'has-image' : ''}`}
                          style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
                        >
                          {!thumb ? 'Ad' : null}
                        </div>

                        <div className="watch-related-info">
                          <span className="watch-featured-ad-badge">Featured Ad</span>
                          <h4>{title}</h4>
                          <p>{campaignTitle}</p>
                          <p>{impressions.toLocaleString()} impressions</p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="watch-related-empty">No featured ads available.</div>
                )}
              </div>
            </section>

            <section className="watch-sidebar-block watch-related-section">
              <h3 className="watch-sidebar-title">Related Videos</h3>

              <div className="watch-related-list">
                {relatedVideos.length ? (
                  relatedVideos.map((item, index) => {
                    const relatedSlug = item?.slug || item?.video_slug || '';
                    const relatedTitle = item?.title || `Related video ${index + 1}`;
                    const relatedCreator =
                      item?.channel_name ||
                      item?.creator_name ||
                      item?.channel?.name ||
                      'Creator';
                    const relatedViews = item?.views || item?.views_count || 0;
                    const relatedIsShort = resolveVideoFormat(item) === 'short';
                    const thumb =
                      item?.short_thumbnail_url ||
                      item?.short_thumbnail_key ||
                      item?.thumbnail_url ||
                      '';
                    const relatedVideoId = item?.id || item?.video_id || null;

                    return (
                      <a
                        href={relatedSlug ? `/watch/${relatedSlug}` : '/watch'}
                        className="watch-related-item"
                        key={item?.id || index}
                        onClick={(event) =>
                          handleRelatedVideoClick(event, relatedVideoId, relatedSlug)
                        }
                      >
                        <div
                          className={`watch-related-thumb ${thumb ? 'has-image' : ''}`}
                          style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
                        >
                          {!thumb ? (relatedIsShort ? 'Short' : 'Related') : null}
                        </div>

                        <div className="watch-related-info">
                          <h4>{relatedTitle}</h4>
                          <p>{relatedCreator}</p>
                          <p>{Number(relatedViews || 0).toLocaleString()} views</p>
                        </div>
                      </a>
                    );
                  })
                ) : (
                  <div className="watch-related-empty">No related videos available.</div>
                )}
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

export default WatchPage;