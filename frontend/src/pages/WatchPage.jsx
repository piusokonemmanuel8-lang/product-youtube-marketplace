import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  addVideoComment,
  addVideoReaction,
  addVideoView,
  addWatchHistory,
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

function WatchPage() {
  const [slug, setSlug] = useState(getSlugFromUrl());
  const [watchData, setWatchData] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
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

  const videoRef = useRef(null);

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

  const channelSlug = useMemo(() => {
    return (
      channel?.channel_slug ||
      channel?.slug ||
      channel?.handle ||
      channel?.username ||
      ''
    );
  }, [channel]);

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
        ] = await Promise.all([
          getRelatedVideos(resolvedVideoId).catch(() => []),
          getVideoComments(resolvedVideoId).catch(() => []),
          getVideoTags(resolvedVideoId).catch(() => []),
          getVideoReactions(resolvedVideoId).catch(() => null),
          getShareSummary(resolvedVideoId).catch(() => null),
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
        setComments(normalizeArrayResponse(commentsResponse));
        setTags(normalizeArrayResponse(tagsResponse));
        setReactions(reactionsResponse || null);
        setShareSummary(shareSummaryResponse || null);

        const savedFlag =
          watchResponse?.saved === true ||
          resolvedVideo?.saved === true ||
          watchResponse?.is_saved === true ||
          watchResponse?.saved_video === true;

        setIsSaved(savedFlag);
      } catch (error) {
        setWatchData(null);
        setRelatedVideos([]);
        setComments([]);
        setTags([]);
        setReactions(null);
        setShareSummary(null);
        setIsSaved(false);
        setErrorMessage(error.message || 'Failed to load watch page');
      } finally {
        setLoading(false);
      }
    }

    loadWatchPage();
  }, [slug]);

  useEffect(() => {
    if (!videoRef.current || !video?.video_url) return;

    const playVideo = async () => {
      try {
        videoRef.current.muted = true;
        await videoRef.current.play();
      } catch (error) {}
    };

    playVideo();
  }, [watchData, video?.video_url]);

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

  async function handleBuyNowClick(event) {
    event.preventDefault();

    const destinationUrl = video?.buy_link || video?.buy_now_url || '';

    if (!videoId || !destinationUrl || destinationUrl === '#') {
      setErrorMessage('Buy now link is not available.');
      return;
    }

    setBuyNowLoading(true);
    setPageMessage('');
    setErrorMessage('');

    try {
      await recordProductClick(videoId, {
        destination_url: destinationUrl,
      });
    } catch (error) {
      // do not block opening external link
    } finally {
      setBuyNowLoading(false);
    }

    window.open(destinationUrl, '_blank', 'noopener,noreferrer');
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
    <div className="watch-page">
      <div className="watch-layout">
        <main className="watch-main">
          <div className="watch-player">
            {video?.video_url ? (
              <video
                ref={videoRef}
                className="watch-real-video"
                controls
                autoPlay
                muted
                playsInline
                src={video.video_url}
                poster={video?.thumbnail_url || ''}
              />
            ) : (
              <div className="watch-player-screen">Video Player Placeholder</div>
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
                  href={video?.buy_link || video?.buy_now_url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleBuyNowClick}
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
                  {Number(
                    channel?.subscriber_count ??
                      channel?.subscribers_count ??
                      channel?.subscribers ??
                      0
                  ).toLocaleString()} subscribers
                </p>
              </div>
            </div>

            <a
              href={channelSlug ? `/channel/${channelSlug}` : '/channel'}
              className="watch-subscribe-btn"
            >
              Visit Channel
            </a>
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
                const thumb = item?.thumbnail_url || '';
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
                      {!thumb ? 'Related' : null}
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
        </aside>
      </div>
    </div>
  );
}

export default WatchPage;