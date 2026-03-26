import React, { useEffect, useMemo, useState } from 'react';
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
} from '../services/uploadVideoService';

function normalizeArrayResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.categories)) return data.categories;
  if (Array.isArray(data?.tags)) return data.tags;
  if (Array.isArray(data?.plans)) return data.plans;
  if (Array.isArray(data?.videos)) return data.videos;
  return [];
}

function normalizeObjectResponse(data) {
  return data?.data || data?.subscription || data?.current || data || null;
}

function isExternalUrl(url = '') {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return !parsed.hostname.includes('supgad.com');
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
  });

  useEffect(() => {
    async function loadFormData() {
      setLoading(true);
      setErrorMessage('');
      setPageMessage('');

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

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setPageMessage('');
    setErrorMessage('');
    setShowExternalPlans(false);
    setUploadStage(isEditMode ? 'Saving changes...' : 'Preparing upload...');
    setUploadPercent(0);

    try {
      if (!channelId) {
        throw new Error('No creator channel found. Create your channel first.');
      }

      let videoKey = editingVideo?.video_key || '';

      if (!isEditMode && !formData.video_file) {
        throw new Error('Please choose a video file');
      }

      if (formData.video_file) {
        setUploadStage('Requesting upload URL...');

        const uploadUrlResponse = await requestVideoUploadUrl({
          fileName: formData.video_file.name,
          contentType: formData.video_file.type || 'video/mp4',
          folder: 'videos',
        });

        const uploadUrl =
          uploadUrlResponse?.uploadUrl ||
          uploadUrlResponse?.data?.uploadUrl ||
          uploadUrlResponse?.signedUrl;

        videoKey =
          uploadUrlResponse?.key ||
          uploadUrlResponse?.data?.key ||
          uploadUrlResponse?.fileKey;

        if (!uploadUrl || !videoKey) {
          throw new Error('Upload URL response is incomplete');
        }

        setUploadStage('Uploading video file...');
        setUploadPercent(0);

        await uploadFileToSignedUrl(uploadUrl, formData.video_file, (percent) => {
          setUploadPercent(percent);
        });

        setUploadPercent(100);
      }

      setUploadStage(isEditMode ? 'Saving video changes...' : 'Saving video metadata...');

      const buyNowUrl = formData.buy_link.trim();
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
        buy_now_enabled: buyNowUrl ? 1 : 0,
        is_monetized: formData.is_monetized ? 1 : 0,
        buy_now_url: buyNowUrl || null,
      };

      if (videoKey) {
        videoPayload.video_key = videoKey;
      }

      let videoId = '';

      if (isEditMode) {
        await updateVideo(editVideoId, videoPayload);
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
        });
      }

      if (externalLink) {
        setShowExternalPlans(false);
      }
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.message ||
        (isEditMode ? 'Failed to update video' : 'Failed to create video');

      const buyNowUrl = formData.buy_link.trim();
      const externalLink = isExternalUrl(buyNowUrl);

      if (!isEditMode && error?.response?.status === 403 && externalLink) {
        setErrorMessage(backendMessage);
        setUploadStage('External posting plan required');
        await loadExternalPlanData();
      } else {
        setErrorMessage(backendMessage);
        setUploadStage(uploadStage || (isEditMode ? 'Update failed' : 'Upload failed'));
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
          <div className="upload-inline-message error">{errorMessage}</div>
        ) : null}

        {pageMessage ? (
          <div className="upload-inline-message success">{pageMessage}</div>
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
              : 'Upload a video file manually, attach category and tags, and optionally send it to moderation.'}
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

          <div className="form-group">
            <label>{isEditMode ? 'Replace Video File (Optional)' : 'Video File Upload'}</label>
            <input
              type="file"
              name="video_file"
              accept="video/*"
              onChange={handleChange}
            />
            {formData.video_file ? (
              <div className="upload-file-meta">
                <strong>{formData.video_file.name}</strong>
                <span>{uploadStage || 'Ready to upload'}</span>
                <span>{uploadPercent}%</span>
              </div>
            ) : isEditMode ? (
              <div className="upload-file-meta">
                <strong>Keeping current uploaded video file</strong>
              </div>
            ) : null}
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