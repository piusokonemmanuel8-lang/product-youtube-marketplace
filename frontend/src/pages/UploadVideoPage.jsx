import React, { useEffect, useMemo, useState } from 'react';
import './UploadVideoPage.css';
import { getMyChannel } from '../services/createChannelService';
import {
  attachTagsToVideo,
  createExternalPostingSubscription,
  createModerationQueue,
  createVideo,
  getCategories,
  getCurrentExternalPostingSubscription,
  getExternalPostingPlans,
  getTags,
  requestVideoUploadUrl,
  uploadFileToSignedUrl,
  uploadVideoFileToBackend,
} from '../services/uploadVideoService';

function normalizeArrayResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.categories)) return data.categories;
  if (Array.isArray(data?.tags)) return data.tags;
  if (Array.isArray(data?.plans)) return data.plans;
  if (Array.isArray(data?.videos)) return data.videos;
  if (Array.isArray(data?.external_posting_plans)) return data.external_posting_plans;
  return [];
}

function normalizeObjectResponse(data) {
  return data?.data || data?.subscription || data?.current || data || null;
}

function normalizeBuyLink(url = '') {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function isExternalUrl(url = '') {
  const normalized = normalizeBuyLink(url);
  if (!normalized) return false;

  try {
    const parsed = new URL(normalized);
    return !parsed.hostname.toLowerCase().includes('supgad.com');
  } catch {
    return false;
  }
}

function getToken() {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('videogad_token') ||
    localStorage.getItem('authToken') ||
    ''
  );
}

function isExternalPlanError(message = '') {
  const lower = String(message || '').toLowerCase();

  return (
    lower.includes('external marketplace auth') ||
    lower.includes('external buy-now links require') ||
    lower.includes('subscribe to a plan to post external product links') ||
    lower.includes('plan limit') ||
    lower.includes('upgrade your subscription')
  );
}

function getExternalLinkErrorText() {
  return 'Upgrade to post with external link';
}

function getVideoFormatFromDuration(durationValue) {
  const seconds = Number(durationValue || 0);
  return seconds > 0 && seconds <= 60 ? 'short' : 'regular';
}

function getAssetUrl(video, primaryKey, fallbackKey = '') {
  if (!video) return '';
  return video[primaryKey] || video[fallbackKey] || '';
}

function getAssetKey(video, primaryKey, fallbackKey = '') {
  if (!video) return '';
  return video[primaryKey] || video[fallbackKey] || '';
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);

  if (!Number.isFinite(value) || value <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 100 || unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

function UploadVideoPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const editVideoId = searchParams.get('edit');
  const isEditMode = Boolean(editVideoId);

  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [uploadPercent, setUploadPercent] = useState(0);
  const [channelId, setChannelId] = useState('');
  const [externalPlans, setExternalPlans] = useState([]);
  const [currentExternalPlan, setCurrentExternalPlan] = useState(null);
  const [showExternalPlans, setShowExternalPlans] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [subscribingPlanId, setSubscribingPlanId] = useState('');
  const [editingVideo, setEditingVideo] = useState(null);
  const [showUpgradeButton, setShowUpgradeButton] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState(null);

  const [formData, setFormData] = useState({
    category_id: '',
    title: '',
    slug: '',
    description: '',
    buy_link: '',
    duration_seconds: '120',
    visibility: 'public',
    comments_enabled: true,
    buy_now_enabled: true,
    is_monetized: false,
    selectedTags: [],
    send_to_moderation: true,
    video_file: null,
    thumbnail_file: null,
    short_thumbnail_file: null,
  });

  const videoFormat = useMemo(
    () => getVideoFormatFromDuration(formData.duration_seconds),
    [formData.duration_seconds]
  );

  const isShortVideo = videoFormat === 'short';

  const currentVideoUrl = useMemo(
    () => getAssetUrl(editingVideo, 'video_url'),
    [editingVideo]
  );

  const currentThumbnailUrl = useMemo(
    () => getAssetUrl(editingVideo, 'thumbnail_url'),
    [editingVideo]
  );

  const currentShortThumbnailUrl = useMemo(
    () => getAssetUrl(editingVideo, 'short_thumbnail_url', 'thumbnail_url'),
    [editingVideo]
  );

  const currentVideoKey = useMemo(
    () => getAssetKey(editingVideo, 'video_key'),
    [editingVideo]
  );

  const currentThumbnailKey = useMemo(
    () => getAssetKey(editingVideo, 'thumbnail_key'),
    [editingVideo]
  );

  const currentShortThumbnailKey = useMemo(
    () => getAssetKey(editingVideo, 'short_thumbnail_key', 'shortThumbnailKey'),
    [editingVideo]
  );

  useEffect(() => {
    async function loadFormData() {
      setLoading(true);
      setErrorMessage('');
      setPageMessage('');
      setShowUpgradeButton(false);

      try {
        const [categoriesResponse, tagsResponse, channelResponse] = await Promise.all([
          getCategories().catch(() => null),
          getTags().catch(() => null),
          getMyChannel().catch(() => null),
        ]);

        const categoriesData = normalizeArrayResponse(categoriesResponse);
        const tagsData = normalizeArrayResponse(tagsResponse);
        const myChannel = channelResponse?.channel || channelResponse?.data || channelResponse;

        setCategories(categoriesData);
        setTags(tagsData);

        if (myChannel?.id) {
          setChannelId(String(myChannel.id));
        }

        if (isEditMode) {
          const token = getToken();

          const response = await fetch('/api/videos/me', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || 'Failed to load video for editing');
          }

          const myVideos = normalizeArrayResponse(data);
          const currentVideo = myVideos.find(
            (video) => String(video.id) === String(editVideoId)
          );

          if (!currentVideo) {
            throw new Error('Video not found for editing');
          }

          setEditingVideo(currentVideo);

          setFormData({
            category_id: currentVideo.category_id ? String(currentVideo.category_id) : '',
            title: currentVideo.title || '',
            slug: currentVideo.slug || '',
            description: currentVideo.description || '',
            buy_link: currentVideo.buy_now_url || currentVideo.buy_link || '',
            duration_seconds: currentVideo.duration_seconds
              ? String(currentVideo.duration_seconds)
              : '120',
            visibility: currentVideo.visibility || 'public',
            comments_enabled:
              currentVideo.comments_enabled === 1 ||
              currentVideo.comments_enabled === true,
            buy_now_enabled:
              currentVideo.buy_now_enabled === 1 ||
              currentVideo.buy_now_enabled === true,
            is_monetized:
              currentVideo.is_monetized === 1 ||
              currentVideo.is_monetized === true,
            selectedTags: [],
            send_to_moderation: false,
            video_file: null,
            thumbnail_file: null,
            short_thumbnail_file: null,
          });
        } else if (categoriesData.length) {
          setFormData((prev) => ({
            ...prev,
            category_id: String(categoriesData[0].id),
          }));
        }
      } catch (error) {
        setErrorMessage(error?.message || 'Failed to load upload form data');
      } finally {
        setLoading(false);
      }
    }

    loadFormData();
  }, [editVideoId, isEditMode]);

  const tagOptions = useMemo(() => normalizeArrayResponse(tags), [tags]);
  const categoryOptions = useMemo(() => normalizeArrayResponse(categories), [categories]);

  function handleChange(event) {
    const { name, value, type, checked, files } = event.target;

    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
      return;
    }

    if (type === 'file') {
      setFormData((prev) => ({
        ...prev,
        [name]: files && files[0] ? files[0] : null,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function clearSelectedFile(fieldName) {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: null,
    }));
  }

  function handleTagToggle(tagId) {
    setFormData((prev) => {
      const exists = prev.selectedTags.includes(tagId);

      return {
        ...prev,
        selectedTags: exists
          ? prev.selectedTags.filter((id) => id !== tagId)
          : [...prev.selectedTags, tagId],
      };
    });
  }

  async function loadExternalPlanData() {
    setPlansLoading(true);

    try {
      const [plansResponse, currentResponse] = await Promise.all([
        getExternalPostingPlans().catch(() => null),
        getCurrentExternalPostingSubscription().catch(() => null),
      ]);

      setExternalPlans(normalizeArrayResponse(plansResponse));
      setCurrentExternalPlan(normalizeObjectResponse(currentResponse));
      setShowExternalPlans(true);
    } finally {
      setPlansLoading(false);
    }
  }

  async function handleSubscribePlan(plan) {
    const planId = String(plan?.id || '');

    if (!planId) return;

    setSubscribingPlanId(planId);
    setErrorMessage('');
    setPageMessage('');

    try {
      await createExternalPostingSubscription({
        plan_id: Number(planId),
      });

      setPageMessage('External posting subscription activated. You can now retry your upload.');
      await loadExternalPlanData();
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to subscribe to external posting plan'
      );
    } finally {
      setSubscribingPlanId('');
    }
  }

  async function updateVideo(videoId, payload) {
    const token = getToken();

    const response = await fetch(`/api/videos/${videoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update video');
    }

    return data;
  }

  async function uploadAsset(file, folder, progressStart = 0, progressEnd = 100) {
    const uploadUrlResponse = await requestVideoUploadUrl({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      folder,
    });

    const uploadUrl =
      uploadUrlResponse?.uploadUrl ||
      uploadUrlResponse?.data?.uploadUrl ||
      uploadUrlResponse?.signedUrl;

    const key =
      uploadUrlResponse?.key ||
      uploadUrlResponse?.data?.key ||
      uploadUrlResponse?.fileKey;

    if (!uploadUrl || !key) {
      throw new Error('Upload URL response is incomplete');
    }

    await uploadFileToSignedUrl(uploadUrl, file, (percent) => {
      const scaled =
        progressStart + ((progressEnd - progressStart) * Number(percent || 0)) / 100;
      setUploadPercent(Math.round(scaled));
    });

    return key;
  }

  async function uploadMainVideoFile(file, progressStart = 0, progressEnd = 100) {
    const response = await uploadVideoFileToBackend(file, (percent) => {
      const scaled =
        progressStart + ((progressEnd - progressStart) * Number(percent || 0)) / 100;
      setUploadPercent(Math.round(scaled));
    });

    const key =
      response?.key ||
      response?.data?.key ||
      response?.fileKey;

    if (!key) {
      throw new Error('Processed video upload response is incomplete');
    }

    const originalSizeBytes = Number(
      response?.original_size_bytes ?? response?.data?.original_size_bytes ?? 0
    );

    const processedSizeBytes = Number(
      response?.processed_size_bytes ?? response?.data?.processed_size_bytes ?? 0
    );

    const savedBytes =
      originalSizeBytes > processedSizeBytes
        ? originalSizeBytes - processedSizeBytes
        : 0;

    const savedPercent =
      originalSizeBytes > 0 && savedBytes > 0
        ? Math.round((savedBytes / originalSizeBytes) * 100)
        : 0;

    setCompressionInfo({
      originalSizeBytes,
      processedSizeBytes,
      savedBytes,
      savedPercent,
    });

    return key;
  }

  function handleGoToSubscription() {
    window.location.href = '/creator-subscription';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setPageMessage('');
    setErrorMessage('');
    setShowExternalPlans(false);
    setShowUpgradeButton(false);
    setUploadStage(isEditMode ? 'Saving changes...' : 'Preparing upload...');
    setUploadPercent(0);
    setCompressionInfo(null);

    try {
      if (!channelId) {
        throw new Error('No creator channel found. Create your channel first.');
      }

      if (!formData.buy_link.trim()) {
        throw new Error('Buy link is required.');
      }

      if (!isEditMode && !formData.video_file) {
        throw new Error('Please choose a video file');
      }

      if (!formData.thumbnail_file && !editingVideo?.thumbnail_key) {
        throw new Error('Please choose a thumbnail image');
      }

      const existingShortThumb =
        editingVideo?.short_thumbnail_key ||
        editingVideo?.shortThumbnailKey ||
        '';

      if (!formData.short_thumbnail_file && !existingShortThumb) {
        throw new Error('Short thumbnail is required.');
      }

      let videoKey = editingVideo?.video_key || '';
      let thumbnailKey = editingVideo?.thumbnail_key || '';
      let shortThumbnailKey = existingShortThumb;

      if (formData.video_file) {
        setUploadStage('Processing video file...');
        videoKey = await uploadMainVideoFile(formData.video_file, 0, 60);
      }

      if (formData.thumbnail_file) {
        setUploadStage('Uploading thumbnail...');
        thumbnailKey = await uploadAsset(formData.thumbnail_file, 'thumbnails', 60, 80);
      }

      if (formData.short_thumbnail_file) {
        setUploadStage('Uploading short thumbnail...');
        shortThumbnailKey = await uploadAsset(
          formData.short_thumbnail_file,
          'short-thumbnails',
          80,
          92
        );
      }

      if (!shortThumbnailKey) {
        throw new Error('Short thumbnail is required.');
      }

      setUploadStage(isEditMode ? 'Saving video changes...' : 'Saving video metadata...');
      setUploadPercent((prev) => Math.max(prev, 93));

      const buyNowUrl = normalizeBuyLink(formData.buy_link.trim());
      const externalLink = isExternalUrl(buyNowUrl);

      const videoPayload = {
        channel_id: Number(channelId),
        category_id: Number(formData.category_id),
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim(),
        duration_seconds: Number(formData.duration_seconds || 0),
        visibility: formData.visibility,
        comments_enabled: formData.comments_enabled ? 1 : 0,
        buy_now_enabled: 1,
        is_monetized: formData.is_monetized ? 1 : 0,
        buy_now_url: buyNowUrl,
        short_thumbnail_key: shortThumbnailKey,
        video_replaced: formData.video_file ? 1 : 0,
      };

      if (videoKey) {
        videoPayload.video_key = videoKey;
      }

      if (thumbnailKey) {
        videoPayload.thumbnail_key = thumbnailKey;
      }

      let videoId = '';

      if (isEditMode) {
        const updatedResponse = await updateVideo(editVideoId, videoPayload);
        const updatedVideo =
          updatedResponse?.video ||
          updatedResponse?.data?.video ||
          updatedResponse?.data ||
          null;

        if (updatedVideo) {
          setEditingVideo(updatedVideo);
        }

        setFormData((prev) => ({
          ...prev,
          video_file: null,
          thumbnail_file: null,
          short_thumbnail_file: null,
        }));

        videoId = editVideoId;
      } else {
        const createdVideo = await createVideo({
          ...videoPayload,
          source_type: 'uploaded',
          storage_provider: 's3',
        });

        videoId =
          createdVideo?.id ||
          createdVideo?.video?.id ||
          createdVideo?.data?.id;

        if (!videoId) {
          throw new Error('Video metadata saved but video id was not returned');
        }
      }

      if (formData.selectedTags.length) {
        setUploadStage('Attaching tags...');
        await attachTagsToVideo(videoId, {
          tag_ids: formData.selectedTags,
        }).catch(() => null);
      }

      if (!isEditMode && formData.send_to_moderation) {
        setUploadStage('Sending to moderation...');
        await createModerationQueue({
          video_id: videoId,
        }).catch(() => null);
      }

      setPageMessage(
        isEditMode
          ? 'Video updated successfully.'
          : 'Video uploaded and saved successfully.'
      );
      setUploadStage(isEditMode ? 'Update complete' : 'Upload complete');
      setUploadPercent(100);

      if (!isEditMode) {
        setFormData({
          category_id: categoryOptions[0] ? String(categoryOptions[0].id) : '',
          title: '',
          slug: '',
          description: '',
          buy_link: '',
          duration_seconds: '120',
          visibility: 'public',
          comments_enabled: true,
          buy_now_enabled: true,
          is_monetized: false,
          selectedTags: [],
          send_to_moderation: true,
          video_file: null,
          thumbnail_file: null,
          short_thumbnail_file: null,
        });
      }

      if (externalLink) {
        setShowExternalPlans(false);
      }
    } catch (error) {
      const backendStatus = error?.response?.status;
      const backendMessage =
        error?.response?.data?.message ||
        error?.message ||
        (isEditMode ? 'Failed to update video' : 'Failed to create video');

      const buyNowUrl = normalizeBuyLink(formData.buy_link.trim());
      const externalLink = isExternalUrl(buyNowUrl);
      const showUpgrade = externalLink && isExternalPlanError(backendMessage);

      if (!isEditMode && (backendStatus === 402 || backendStatus === 403) && externalLink) {
        setErrorMessage(getExternalLinkErrorText(backendMessage));
        setShowUpgradeButton(true);
        setUploadStage('Subscription required');
        await loadExternalPlanData();
      } else if (showUpgrade) {
        setErrorMessage(getExternalLinkErrorText(backendMessage));
        setShowUpgradeButton(true);
        setUploadStage(isEditMode ? 'Update failed' : 'Upload failed');
      } else {
        setErrorMessage(backendMessage);
        setShowUpgradeButton(false);
        setUploadStage(isEditMode ? 'Update failed' : 'Upload failed');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="upload-loading-page">
        <div className="upload-loading-card">
          {isEditMode ? 'Loading video editor...' : 'Loading upload form...'}
        </div>
      </div>
    );
  }

  return (
    <div className="videogad-upload-page">
      <div className="videogad-upload-card">
        {errorMessage ? (
          <div
            className="upload-inline-message error"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <span>{errorMessage}</span>

            {showUpgradeButton ? (
              <button
                type="button"
                className="primary-btn"
                onClick={handleGoToSubscription}
                style={{ minWidth: '190px' }}
              >
                Upgrade Subscription
              </button>
            ) : null}
          </div>
        ) : null}

        {pageMessage ? (
          <div className="upload-inline-message success">{pageMessage}</div>
        ) : null}

        {compressionInfo ? (
          <div className="upload-inline-message success">
            <strong>Compression result:</strong>{' '}
            Original {formatBytes(compressionInfo.originalSizeBytes)} | Final{' '}
            {formatBytes(compressionInfo.processedSizeBytes)} | Saved{' '}
            {formatBytes(compressionInfo.savedBytes)}
            {compressionInfo.savedPercent > 0 ? ` (${compressionInfo.savedPercent}%)` : ''}
          </div>
        ) : null}

        {(submitting || uploadStage || uploadPercent > 0) ? (
          <div className="upload-progress-card">
            <div className="upload-progress-top">
              <strong>{uploadStage || (isEditMode ? 'Saving...' : 'Uploading...')}</strong>
              <span>{uploadPercent}%</span>
            </div>
            <div className="upload-progress-bar">
              <div
                className="upload-progress-fill"
                style={{ width: `${uploadPercent}%` }}
              ></div>
            </div>
          </div>
        ) : null}

        <div className="upload-header">
          <p className="eyebrow">Creator Studio</p>
          <h1>{isEditMode ? 'Edit Video' : 'Upload Video'}</h1>
          <span>
            {isEditMode
              ? 'Update your submitted video details here.'
              : 'Upload a video file manually, attach category, thumbnail, short thumbnail and tags, and optionally send it to moderation.'}
          </span>
        </div>

        {showExternalPlans ? (
          <div className="upload-external-plan-box">
            <div className="panel-head">
              <h2>External Posting Plans</h2>
            </div>

            {plansLoading ? (
              <p>Loading plans...</p>
            ) : (
              <>
                {currentExternalPlan?.id ? (
                  <div className="upload-inline-message success" style={{ marginBottom: '16px' }}>
                    Active plan detected. Retry your upload.
                  </div>
                ) : null}

                <div className="quick-actions-list">
                  {externalPlans.map((plan) => (
                    <div className="quick-action-card" key={plan.id}>
                      <h4>{plan.name || plan.title || `Plan ${plan.id}`}</h4>
                      <p>{plan.description || 'External posting access plan.'}</p>
                      <p>
                        <strong>
                          {plan.price_formatted || plan.formatted_price || plan.price || ''}
                        </strong>
                      </p>
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={() => handleSubscribePlan(plan)}
                        disabled={subscribingPlanId === String(plan.id)}
                      >
                        {subscribingPlanId === String(plan.id) ? 'Subscribing...' : 'Choose Plan'}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}

        <form className="upload-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Video Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter video title"
                required
              />
            </div>

            <div className="form-group">
              <label>Slug</label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="enter-video-slug"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the product video"
              rows="5"
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Buy Link</label>
              <input
                type="text"
                name="buy_link"
                value={formData.buy_link}
                onChange={handleChange}
                placeholder="https://your-store-link.com/product"
                required
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
              >
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name || category.title || `Category ${category.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Duration Seconds</label>
              <input
                type="number"
                min="1"
                name="duration_seconds"
                value={formData.duration_seconds}
                onChange={handleChange}
                placeholder="Enter video duration in seconds"
                required
              />
              <div className="upload-file-meta">
                <strong>
                  Format detected: {isShortVideo ? 'Short video' : 'Regular video'}
                </strong>
                <span>
                  {isShortVideo
                    ? '60 seconds or below will go to Shorts.'
                    : 'Above 60 seconds stays in normal videos.'}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>Visibility</label>
              <select
                name="visibility"
                value={formData.visibility}
                onChange={handleChange}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="unlisted">Unlisted</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>{isEditMode ? 'Replace Video File (Optional)' : 'Video File Upload'}</label>

              {isEditMode && currentVideoUrl ? (
                <div className="upload-existing-asset-card">
                  <div className="upload-existing-asset-top">
                    <strong>Current uploaded video</strong>
                    <span>{currentVideoKey || 'Existing S3 video kept unless replaced'}</span>
                  </div>

                  <div className="upload-existing-video-wrap">
                    <video
                      className="upload-existing-video"
                      controls
                      preload="metadata"
                      src={currentVideoUrl}
                    >
                      Your browser does not support video preview.
                    </video>
                  </div>
                </div>
              ) : null}

              <input
                type="file"
                name="video_file"
                accept="video/*"
                onChange={handleChange}
              />

              {formData.video_file ? (
                <div className="upload-file-meta">
                  <strong>{formData.video_file.name}</strong>
                  <span>
                    This new file will be processed, compressed, and replace the current video after save.
                  </span>
                  <button
                    type="button"
                    className="upload-clear-btn"
                    onClick={() => clearSelectedFile('video_file')}
                  >
                    Clear selected replacement
                  </button>
                </div>
              ) : isEditMode ? (
                <div className="upload-file-meta">
                  <strong>Keeping current uploaded video file</strong>
                  <span>Select a new file only if you want to replace the current one.</span>
                </div>
              ) : null}
            </div>

            <div className="form-group">
              <label>{isEditMode ? 'Replace Thumbnail (Optional)' : 'Thumbnail Upload'}</label>

              {isEditMode && currentThumbnailUrl ? (
                <div className="upload-existing-asset-card">
                  <div className="upload-existing-asset-top">
                    <strong>Current thumbnail</strong>
                    <span>{currentThumbnailKey || 'Existing thumbnail kept unless replaced'}</span>
                  </div>

                  <div className="upload-existing-image-wrap">
                    <img
                      className="upload-existing-image"
                      src={currentThumbnailUrl}
                      alt="Current thumbnail"
                    />
                  </div>
                </div>
              ) : null}

              <input
                type="file"
                name="thumbnail_file"
                accept="image/*"
                onChange={handleChange}
                required={!isEditMode}
              />

              {formData.thumbnail_file ? (
                <div className="upload-file-meta">
                  <strong>{formData.thumbnail_file.name}</strong>
                  <span>This new file will replace the current thumbnail after save.</span>
                  <button
                    type="button"
                    className="upload-clear-btn"
                    onClick={() => clearSelectedFile('thumbnail_file')}
                  >
                    Clear selected replacement
                  </button>
                </div>
              ) : isEditMode && editingVideo?.thumbnail_key ? (
                <div className="upload-file-meta">
                  <strong>Keeping current thumbnail</strong>
                </div>
              ) : null}
            </div>
          </div>

          <div className="form-group">
            <label>
              {isEditMode ? 'Replace Short Thumbnail (Optional)' : 'Short Thumbnail Upload'}
            </label>

            {isEditMode && currentShortThumbnailUrl ? (
              <div className="upload-existing-asset-card">
                <div className="upload-existing-asset-top">
                  <strong>Current short thumbnail</strong>
                  <span>
                    {currentShortThumbnailKey || 'Existing short thumbnail kept unless replaced'}
                  </span>
                </div>

                <div className="upload-existing-image-wrap">
                  <img
                    className="upload-existing-image"
                    src={currentShortThumbnailUrl}
                    alt="Current short thumbnail"
                  />
                </div>
              </div>
            ) : null}

            <input
              type="file"
              name="short_thumbnail_file"
              accept="image/*"
              onChange={handleChange}
              required={!isEditMode}
            />

            {formData.short_thumbnail_file ? (
              <div className="upload-file-meta">
                <strong>{formData.short_thumbnail_file.name}</strong>
                <span>This new file will replace the current short thumbnail after save.</span>
                <button
                  type="button"
                  className="upload-clear-btn"
                  onClick={() => clearSelectedFile('short_thumbnail_file')}
                >
                  Clear selected replacement
                </button>
              </div>
            ) : isEditMode && (
              editingVideo?.short_thumbnail_key ||
              editingVideo?.shortThumbnailKey
            ) ? (
              <div className="upload-file-meta">
                <strong>Keeping current short thumbnail</strong>
              </div>
            ) : (
              <div className="upload-file-meta">
                <strong>Short thumbnail is compulsory</strong>
                <span>This will be used in the Shorts section.</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Tags</label>
            <div className="upload-tags-list">
              {tagOptions.map((tag) => {
                const tagId = tag.id;
                const tagName = tag.name || tag.title || `Tag ${tagId}`;
                const active = formData.selectedTags.includes(tagId);

                return (
                  <button
                    key={tagId}
                    type="button"
                    className={`upload-tag-pill ${active ? 'active' : ''}`}
                    onClick={() => handleTagToggle(tagId)}
                  >
                    {tagName}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="upload-options">
            <label className="check-row">
              <input
                type="checkbox"
                name="comments_enabled"
                checked={formData.comments_enabled}
                onChange={handleChange}
              />
              Allow comments
            </label>

            <label className="check-row">
              <input
                type="checkbox"
                name="is_monetized"
                checked={formData.is_monetized}
                onChange={handleChange}
              />
              Monetize this video
            </label>
          </div>

          {!isEditMode ? (
            <div className="upload-options">
              <label className="check-row">
                <input
                  type="checkbox"
                  name="send_to_moderation"
                  checked={formData.send_to_moderation}
                  onChange={handleChange}
                />
                Send video to moderation queue after upload
              </label>
            </div>
          ) : null}

          <div className="form-actions">
            <a href="/my-videos" className="ghost-btn">Back to My Videos</a>
            <button type="submit" className="primary-btn" disabled={submitting}>
              {submitting
                ? (isEditMode ? 'Saving Changes...' : 'Uploading...')
                : (isEditMode ? 'Save Changes' : 'Upload Video')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UploadVideoPage;