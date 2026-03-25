import React, { useEffect, useState } from 'react';
import {
  createChannel,
  deleteMyChannel,
  getMyChannel,
  updateMyChannel,
} from '../services/createChannelService';
import { getCreatorProfile } from '../services/creatorApi';

function normalizeHandle(value = '') {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

function slugify(value = '') {
  return value
    .replace(/^@+/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function CreateChannelPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pageMessage, setPageMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasExistingChannel, setHasExistingChannel] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  const [formData, setFormData] = useState({
    channel_name: '',
    channel_handle: '',
    channel_slug: '',
    description: '',
    category: '',
    country: '',
    profile_image_url: '',
    banner_image_url: '',
    logo_file: null,
    banner_file: null,
  });

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setErrorMessage('');
      setPageMessage('');

      try {
        try {
          const creatorResponse = await getCreatorProfile();
          const creator =
            creatorResponse?.creator_profile ||
            creatorResponse?.profile ||
            creatorResponse?.data ||
            creatorResponse;

          if (creator && (creator.id || creator.display_name || creator.user_id)) {
            setIsCreator(true);
          } else {
            setIsCreator(false);
            setErrorMessage('Creator setup required. Create your creator profile first.');
            setLoading(false);
            return;
          }
        } catch (error) {
          setIsCreator(false);
          setErrorMessage('Creator setup required. Create your creator profile first.');
          setLoading(false);
          return;
        }

        try {
          const channelResponse = await getMyChannel();
          const channel = channelResponse?.channel || channelResponse?.data || channelResponse;

          if (channel && (channel.id || channel.channel_name || channel.name)) {
            setHasExistingChannel(true);
            setFormData({
              channel_name: channel.channel_name || channel.name || '',
              channel_handle: normalizeHandle(
                channel.channel_handle || channel.handle || ''
              ),
              channel_slug: channel.channel_slug || channel.slug || '',
              description: channel.description || channel.bio || '',
              category: channel.category || '',
              country: channel.country || '',
              profile_image_url: channel.profile_image_url || channel.avatar_url || '',
              banner_image_url: channel.banner_image_url || channel.cover_image_url || '',
              logo_file: null,
              banner_file: null,
            });
          } else {
            setHasExistingChannel(false);
          }
        } catch (error) {
          setHasExistingChannel(false);
        }
      } catch (error) {
        setErrorMessage(error.message || 'Failed to load channel page');
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, []);

  function handleChange(event) {
    const { name, value, type, files } = event.target;

    if (type === 'file') {
      setFormData((prev) => ({
        ...prev,
        [name]: files && files[0] ? files[0] : null,
      }));
      return;
    }

    if (name === 'channel_handle') {
      const normalizedHandle = value;
      const nextSlug = slugify(normalizedHandle);

      setFormData((prev) => ({
        ...prev,
        channel_handle: normalizedHandle,
        channel_slug: prev.channel_slug ? prev.channel_slug : nextSlug,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function buildPayload() {
    const cleanHandle = normalizeHandle(formData.channel_handle);
    const cleanSlug = formData.channel_slug
      ? slugify(formData.channel_slug)
      : slugify(cleanHandle);

    return {
      channel_name: formData.channel_name.trim(),
      channel_handle: cleanHandle,
      channel_slug: cleanSlug,
      description: formData.description.trim(),
      category: formData.category.trim(),
      country: formData.country.trim(),
      profile_image_url: formData.profile_image_url.trim(),
      banner_image_url: formData.banner_image_url.trim(),

      name: formData.channel_name.trim(),
      handle: cleanHandle,
      slug: cleanSlug,
      bio: formData.description.trim(),
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setPageMessage('');

    try {
      if (!isCreator) {
        throw new Error('Creator setup required. Create your creator profile first.');
      }

      const payload = buildPayload();

      if (!payload.channel_name || !payload.channel_handle || !payload.channel_slug) {
        throw new Error('channel_name, channel_handle and channel_slug are required');
      }

      if (hasExistingChannel) {
        await updateMyChannel(payload);
        setPageMessage('Channel updated successfully.');
      } else {
        await createChannel(payload);
        setHasExistingChannel(true);
        setPageMessage('Channel created successfully.');
      }
    } catch (error) {
      setErrorMessage(error.message || 'Failed to save channel');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm('Delete your channel?');
    if (!confirmed) return;

    setDeleting(true);
    setErrorMessage('');
    setPageMessage('');

    try {
      await deleteMyChannel();
      setHasExistingChannel(false);
      setFormData({
        channel_name: '',
        channel_handle: '',
        channel_slug: '',
        description: '',
        category: '',
        country: '',
        profile_image_url: '',
        banner_image_url: '',
        logo_file: null,
        banner_file: null,
      });
      setPageMessage('Channel deleted successfully.');
    } catch (error) {
      setErrorMessage(error.message || 'Failed to delete channel');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="create-channel-loading-page">
        <div className="create-channel-loading-card">Loading channel form...</div>
      </div>
    );
  }

  return (
    <div className="create-channel-page dark-theme">
      <div className="create-channel-shell">
        {errorMessage ? (
          <div className="create-channel-inline-message error">{errorMessage}</div>
        ) : null}

        {pageMessage ? (
          <div className="create-channel-inline-message success">{pageMessage}</div>
        ) : null}

        <section className="create-channel-card">
          <div className="create-channel-head">
            <p className="eyebrow">Creator Studio</p>
            <h1>{hasExistingChannel ? 'Edit Channel' : 'Create Channel'}</h1>
            <span>Set up your public creator identity for VideoGad.</span>
          </div>

          {!isCreator ? (
            <div className="creator-required-box">
              <h3>Creator setup required</h3>
              <p>
                You need to create your creator profile before you can create a channel.
              </p>
              <a href="/become-creator" className="primary-btn" style={{ display: 'inline-block', marginTop: '12px' }}>
                Become a Creator
              </a>
            </div>
          ) : null}

          <form className="create-channel-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Channel Name</label>
                <input
                  type="text"
                  name="channel_name"
                  value={formData.channel_name}
                  onChange={handleChange}
                  placeholder="Enter channel name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Channel Handle</label>
                <input
                  type="text"
                  name="channel_handle"
                  value={formData.channel_handle}
                  onChange={handleChange}
                  placeholder="@yourhandle"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Channel Slug</label>
              <input
                type="text"
                  name="channel_slug"
                  value={formData.channel_slug}
                  onChange={handleChange}
                  placeholder="your-channel-slug"
                  required
              />
            </div>

            <div className="form-group">
              <label>Channel Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your channel"
                rows="5"
                required
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="e.g. Clothing"
                />
              </div>

              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="e.g. Nigeria"
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Logo Upload</label>
                <input
                  type="file"
                  name="logo_file"
                  accept="image/*"
                  onChange={handleChange}
                />
                <small className="field-help">
                  Upload UI only for now. No logo upload endpoint has been provided yet.
                </small>
              </div>

              <div className="form-group">
                <label>Banner Upload</label>
                <input
                  type="file"
                  name="banner_file"
                  accept="image/*"
                  onChange={handleChange}
                />
                <small className="field-help">
                  Upload UI only for now. No banner upload endpoint has been provided yet.
                </small>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Profile Image URL</label>
                <input
                  type="text"
                  name="profile_image_url"
                  value={formData.profile_image_url}
                  onChange={handleChange}
                  placeholder="https://your-image-url.com/profile.jpg"
                />
              </div>

              <div className="form-group">
                <label>Banner Image URL</label>
                <input
                  type="text"
                  name="banner_image_url"
                  value={formData.banner_image_url}
                  onChange={handleChange}
                  placeholder="https://your-image-url.com/banner.jpg"
                />
              </div>
            </div>

            <div className="form-actions">
              <a href="/creator-dashboard" className="ghost-btn">Back</a>

              <div className="create-channel-actions-right">
                {hasExistingChannel ? (
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Delete Channel'}
                  </button>
                ) : null}

                <button type="submit" className="primary-btn" disabled={saving || !isCreator}>
                  {saving
                    ? hasExistingChannel
                      ? 'Updating...'
                      : 'Creating...'
                    : hasExistingChannel
                    ? 'Update Channel'
                    : 'Create Channel'}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default CreateChannelPage;