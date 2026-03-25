import React, { useEffect, useMemo, useState } from 'react';
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
  removeVideoReaction,
  saveVideo,
  shareVideo,
  unsaveVideo,
} from '../services/watchService';

function normalizeArrayResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.comments)) return data.comments;
  if (Array.isArray(data?.videos)) return data.videos;
  if (Array.isArray(data?.related)) return data.related;
  if (Array.isArray(data?.tags)) return data.tags;
  return [];
}

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function getDemoWatchData(slug) {
  return {
    video: {
      id: 9999,
      slug,
      title: 'Demo Video Preview Page',
      description:
        'This is demo watch content because no real video exists yet in the database. Once real videos are available, this page will automatically use the actual backend response.',
      views_count: 2450,
      published_at: 'Demo mode',
      buy_link: '#',
      video_url: '',
    },
    channel: {
      id: 888,
      slug: 'demo-channel',
      channel_slug: 'demo-channel',
      name: 'VideoGad Demo Channel',
      channel_name: 'VideoGad Demo Channel',
      subscribers_count: 1250,
    },
    saved: false,
    isDemo: true,
  };
}

function getDemoRelatedVideos() {
  return [
    {
      id: 1,
      slug: 'demo-related-video-1',
      title: 'Demo Related Video One',
      creator_name: 'Demo Creator',
      views: 1200,
    },
    {
      id: 2,
      slug: 'demo-related-video-2',
      title: 'Demo Related Video Two',
      creator_name: 'Demo Creator',
      views: 980,
    },
    {
      id: 3,
      slug: 'demo-related-video-3',
      title: 'Demo Related Video Three',
      creator_name: 'Demo Creator',
      views: 2100,
    },
  ];
}

function getDemoComments() {
  return [
    {
      id: 1,
      author_name: 'John',
      content: 'This is demo comment content until real video comments are available.',
      created_at: 'Just now',
    },
    {
      id: 2,
      author_name: 'Mary',
      content: 'The watch page layout is working fine in demo mode.',
      created_at: '2 mins ago',
    },
  ];
}

function getDemoTags() {
  return [{ name: 'demo' }, { name: 'preview' }, { name: 'videogad' }];
}

function getDemoReactions() {
  return {
    likes_count: 140,
    dislikes_count: 9,
  };
}

function getDemoShareSummary() {
  return {
    total_shares: 27,
  };
}

function WatchPage() {
  const slug = getQueryParam('slug') || 'sample-video';
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
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    async function loadWatchPage() {
      setLoading(true);
      setErrorMessage('');
      setPageMessage('');

      try {
        const watchResponse = await getWatchPageBySlug(slug);
        setWatchData(watchResponse);

        const videoId =
          watchResponse?.video?.id ||
          watchResponse?.id ||
          watchResponse?.data?.id;

        if (!videoId) {
          throw new Error('Video id not found in watch response');
        }

        await Promise.all([
          addVideoView(videoId).catch(() => null),
          addWatchHistory(videoId).catch(() => null),
        ]);

        const [
          relatedResponse,
          commentsResponse,
          tagsResponse,
          reactionsResponse,
          shareSummaryResponse,
        ] = await Promise.all([
          getRelatedVideos(videoId).catch(() => []),
          getVideoComments(videoId).catch(() => []),
          getVideoTags(videoId).catch(() => []),
          getVideoReactions(videoId).catch(() => null),
          getShareSummary(videoId).catch(() => null),
        ]);

        setRelatedVideos(normalizeArrayResponse(relatedResponse));
        setComments(normalizeArrayResponse(commentsResponse));
        setTags(normalizeArrayResponse(tagsResponse));
        setReactions(reactionsResponse || null);
        setShareSummary(shareSummaryResponse || null);

        const savedFlag =
          watchResponse?.saved === true ||
          watchResponse?.video?.saved === true ||
          watchResponse?.is_saved === true;

        setIsSaved(savedFlag);
        setIsDemoMode(false);
      } catch (error) {
        const message = error.message || '';

        if (
          message.toLowerCase().includes('video not found') ||
          message.toLowerCase().includes('not found')
        ) {
          setWatchData(getDemoWatchData(slug));
          setRelatedVideos(getDemoRelatedVideos());
          setComments(getDemoComments());
          setTags(getDemoTags());
          setReactions(getDemoReactions());
          setShareSummary(getDemoShareSummary());
          setIsSaved(false);
          setIsDemoMode(true);
          setPageMessage('Demo mode is showing because no real video exists yet.');
          setErrorMessage('');
        } else {
          setErrorMessage(message || 'Failed to load watch page');
        }
      } finally {
        setLoading(false);
      }
    }

    loadWatchPage();
  }, [slug]);

  const videoId = useMemo(() => {
    return watchData?.video?.id || watchData?.id || watchData?.data?.id || null;
  }, [watchData]);

  const video = useMemo(() => {
    return watchData?.video || watchData?.data || watchData || {};
  }, [watchData]);

  const channel = useMemo(() => {
    return watchData?.channel || video?.channel || {};
  }, [watchData, video]);

  const channelSlug = useMemo(() => {
    return (
      channel?.slug ||
      channel?.channel_slug ||
      channel?.handle ||
      channel?.username ||
      'demo-channel'
    );
  }, [channel]);

  async function handleReact(type) {
    if (!videoId) return;

    if (isDemoMode) {
      setPageMessage(`Demo mode: ${type} clicked.`);
      return;
    }

    setReactionAction(true);
    setPageMessage('');
    setErrorMessage('');

    try {
      await addVideoReaction(videoId, { type });
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

    if (isDemoMode) {
      setPageMessage('Demo mode: reaction removed.');
      return;
    }

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

    if (isDemoMode) {
      setIsSaved((prev) => !prev);
      setPageMessage(isSaved ? 'Demo mode: unsaved.' : 'Demo mode: saved.');
      return;
    }

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

    if (isDemoMode) {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch (error) {
        // ignore
      }
      setPageMessage('Demo mode: share clicked and link copied.');
      return;
    }

    setShareLoading(true);
    setPageMessage('');
    setErrorMessage('');

    try {
      await shareVideo(videoId, { platform: 'copy_link' });
      const summary = await getShareSummary(videoId).catch(() => null);
      setShareSummary(summary || null);

      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch (error) {
        // ignore
      }

      setPageMessage('Share recorded and link copied.');
    } catch (error) {
      setErrorMessage(error.message || 'Failed to share video');
    } finally {
      setShareLoading(false);
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();
    if (!videoId || !commentText.trim()) return;

    if (isDemoMode) {
      const demoComment = {
        id: Date.now(),
        author_name: 'You',
        content: commentText,
        created_at: 'Just now',
      };
      setComments((prev) => [demoComment, ...prev]);
      setCommentText('');
      setPageMessage('Demo mode: comment added locally.');
      return;
    }

    setCommentLoading(true);
    setPageMessage('');
    setErrorMessage('');

    try {
      await addVideoComment(videoId, {
        content: commentText,
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
              <video className="watch-real-video" controls src={video.video_url} />
            ) : (
              <div className="watch-player-screen">
                {isDemoMode ? 'Demo Video Preview' : 'Video Player Placeholder'}
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
                  {video?.views_count || video?.views || 0} views
                </div>
                <div className="watch-meta-sub">
                  {video?.created_at || video?.published_at || 'Recently uploaded'}
                </div>
              </div>

              <div className="watch-action-row">
                <button
                  type="button"
                  className="watch-action-btn"
                  onClick={() => handleReact('like')}
                  disabled={reactionAction}
                >
                  Like {reactions?.likes_count ?? reactions?.likes ?? ''}
                </button>

                <button
                  type="button"
                  className="watch-action-btn"
                  onClick={() => handleReact('dislike')}
                  disabled={reactionAction}
                >
                  Dislike {reactions?.dislikes_count ?? reactions?.dislikes ?? ''}
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
                  Share {shareSummary?.total_shares ?? shareSummary?.shares ?? ''}
                </button>

                <a
                  className="watch-buy-btn"
                  href={video?.buy_link || '#'}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buy Now
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
                  {channel?.subscribers_count || channel?.subscribers || 0} subscribers
                </p>
              </div>
            </div>

            <a
              href={`/channel?slug=${channelSlug}`}
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
                  const commentName =
                    comment?.user?.full_name ||
                    comment?.user?.username ||
                    comment?.author_name ||
                    'Viewer';

                  const content =
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
                          <span>{comment?.created_at || 'Just now'}</span>
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

                return (
                  <a
                    href={`/watch?slug=${relatedSlug}`}
                    className="watch-related-item"
                    key={item?.id || index}
                  >
                    <div className="watch-related-thumb">Related</div>

                    <div className="watch-related-info">
                      <h4>{relatedTitle}</h4>
                      <p>{relatedCreator}</p>
                      <p>{relatedViews} views</p>
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