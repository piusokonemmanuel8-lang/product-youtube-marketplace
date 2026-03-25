import React, { useEffect, useState } from 'react';
import { createCreatorProfile, getCreatorProfile, getMyChannel } from '../services/creatorApi';

function BecomeCreatorPage() {
  const [form, setForm] = useState({
    display_name: '',
    bio: '',
    country: '',
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const boot = async () => {
      try {
        const creatorResponse = await getCreatorProfile();
        const creator =
          creatorResponse?.creator_profile ||
          creatorResponse?.profile ||
          creatorResponse?.data ||
          creatorResponse;

        if (creator && (creator.id || creator.display_name || creator.user_id)) {
          try {
            await getMyChannel();
            window.location.href = '/creator-dashboard';
            return;
          } catch (channelError) {
            window.location.href = '/create-channel';
            return;
          }
        }
      } catch (creatorError) {
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      await createCreatorProfile(form);
      setMessage('Creator profile created successfully.');
      window.location.href = '/create-channel';
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create creator profile.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="create-channel-loading-page">
        <div className="create-channel-loading-card">Checking creator status...</div>
      </div>
    );
  }

  return (
    <div className="create-channel-page dark-theme">
      <div className="create-channel-shell">
        <section className="create-channel-card">
          <div className="create-channel-head">
            <p className="eyebrow">Creator Studio</p>
            <h1>Become a Creator</h1>
            <span>Create your creator profile before creating your channel.</span>
          </div>

          {message ? (
            <div className="create-channel-inline-message success">{message}</div>
          ) : null}

          {error ? (
            <div className="create-channel-inline-message error">{error}</div>
          ) : null}

          <form className="create-channel-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                name="display_name"
                value={form.display_name}
                onChange={handleChange}
                placeholder="Your creator name"
                required
              />
            </div>

            <div className="form-group">
              <label>Bio</label>
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleChange}
                placeholder="Tell people about yourself"
                rows="5"
              />
            </div>

            <div className="form-group">
              <label>Country</label>
              <input
                type="text"
                name="country"
                value={form.country}
                onChange={handleChange}
                placeholder="Nigeria"
              />
            </div>

            <div className="form-actions">
              <a href="/create-channel" className="ghost-btn">Back</a>

              <div className="create-channel-actions-right">
                <button type="submit" className="primary-btn" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Become Creator'}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default BecomeCreatorPage;