import React, { useEffect, useState } from 'react';
import '../creator-dashboard.css';
import {
  getCurrentExternalPostingSubscription,
  getExternalPostingPlans,
  getMarketplaceAuthStatus,
  getMyChannel,
  saveMarketplaceAuth,
} from '../services/creatorDashboardService';

function formatDateLabel(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function CreatorMarketplaceAuthPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [channel, setChannel] = useState(null);
  const [marketplaceAuth, setMarketplaceAuth] = useState(null);
  const [externalPosting, setExternalPosting] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageMessage, setPageMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [form, setForm] = useState({
    store_name: '',
    store_url: '',
    what_they_sell: '',
  });

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setErrorMessage('');
      setPageMessage('');

      const [channelResponse, marketplaceResponse, externalPostingResponse, plansResponse] =
        await Promise.all([
          getMyChannel().catch(() => null),
          getMarketplaceAuthStatus().catch(() => null),
          getCurrentExternalPostingSubscription().catch(() => null),
          getExternalPostingPlans().catch(() => null),
        ]);

      const channelData =
        channelResponse?.channel || channelResponse?.data || channelResponse || null;

      const authData =
        marketplaceResponse?.creator_marketplace_auth ||
        marketplaceResponse?.data ||
        marketplaceResponse ||
        null;

      const externalData =
        externalPostingResponse?.data || externalPostingResponse || null;

      const plansData =
        plansResponse?.external_posting_plans ||
        plansResponse?.plans ||
        plansResponse?.data ||
        [];

      setChannel(channelData);
      setMarketplaceAuth(authData);
      setExternalPosting(externalData);
      setPlans(Array.isArray(plansData) ? plansData : []);

      setForm({
        store_name: authData?.supgad_account_id || '',
        store_url: authData?.supgad_store_url || '',
        what_they_sell: '',
      });

      setLoading(false);
    }

    loadPage();
  }, []);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('videogad_token');
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setPageMessage('');

    const cleanStoreName = form.store_name.trim();
    const cleanStoreUrl = form.store_url.trim();
    const lowerUrl = cleanStoreUrl.toLowerCase();

    if (!cleanStoreName) {
      setSaving(false);
      setErrorMessage('Store name is required.');
      return;
    }

    if (!cleanStoreUrl) {
      setSaving(false);
      setErrorMessage('Supgad store URL is required.');
      return;
    }

    if (!lowerUrl.includes('supgad.com')) {
      setSaving(false);
      setErrorMessage('Only Supgad store URLs are allowed.');
      return;
    }

    try {
      await saveMarketplaceAuth({
        auth_type: 'supgad',
        supgad_account_id: cleanStoreName,
        supgad_store_url: cleanStoreUrl,
      });

      const refreshed = await getMarketplaceAuthStatus().catch(() => null);
      const refreshedAuth =
        refreshed?.creator_marketplace_auth ||
        refreshed?.data ||
        refreshed ||
        null;

      setMarketplaceAuth(refreshedAuth);
      setPageMessage('Marketplace authentication saved successfully.');
    } catch (error) {
      setErrorMessage(error.message || 'Failed to save marketplace authentication.');
    } finally {
      setSaving(false);
    }
  }

  const channelName =
    channel?.channel_name || channel?.name || 'Creator';
  const channelHandle =
    channel?.channel_handle || channel?.handle || '';
  const channelSlug =
    channel?.channel_slug || channel?.slug || '';
  const hasChannel = !!(channel?.id || channel?.channel_name || channel?.name);

  const isVerified =
    marketplaceAuth?.is_authenticated === 1 ||
    marketplaceAuth?.is_authenticated === true ||
    marketplaceAuth?.is_internal_supgad === 1 ||
    marketplaceAuth?.is_internal_supgad === true ||
    String(marketplaceAuth?.supgad_status || '').toLowerCase() === 'active';

  const authStatus = isVerified ? 'Verified' : 'Pending';
  const lastCheck = formatDateLabel(
    marketplaceAuth?.verified_at || marketplaceAuth?.updated_at
  );

  const externalPlanStatus =
    externalPosting?.active === true ||
    externalPosting?.is_active === true ||
    String(externalPosting?.status || '').toLowerCase() === 'active'
      ? 'Active'
      : 'Not Active';

  if (loading) {
    return (
      <div className="videogad-dashboard-page">
        <main className="videogad-dashboard-main">
          <div className="videogad-panel">
            <h2>Loading marketplace auth...</h2>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="videogad-dashboard-page">
      <aside className={`videogad-dashboard-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="videogad-sidebar-top">
          <div className="videogad-brand">VideoGad</div>

          <button
            className="videogad-close-menu"
            onClick={() => setMenuOpen(false)}
            type="button"
          >
            ✕
          </button>
        </div>

        <nav className="videogad-dashboard-nav">
          <a href="/creator-dashboard">Dashboard</a>
          <a href="/create-channel">{hasChannel ? 'Edit Channel' : 'Create Channel'}</a>
          <a href="/upload-video">Upload Video</a>
          <a href="/my-videos">My Videos</a>
          <a href="/creator-analytics">Analytics</a>
          <a href="/creator-earnings">Earnings</a>
          <a href="/creator-payout">Payout</a>
          <a href="/account-settings">Settings</a>

          {hasChannel ? (
            <div className="creator-channel-box">
              <p className="creator-channel-label">Your Channel</p>
              <h4>{channelName}</h4>
              <span>{channelHandle}</span>
              <small>{channelSlug}</small>
            </div>
          ) : null}

          <a href="/creator-marketplace-auth" className="creator-sidebar-auth-box active">
            <p className="creator-channel-label">Authentication</p>
            <h4>Marketplace Auth</h4>
            <span>Connect your Supgad store</span>
          </a>

          <button
            type="button"
            className="dashboard-logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </nav>
      </aside>

      <main className="videogad-dashboard-main">
        <header className="videogad-dashboard-header">
          <div className="videogad-mobile-topbar">
            <button
              className="videogad-menu-toggle"
              onClick={() => setMenuOpen(true)}
              type="button"
            >
              ☰
            </button>
            <div className="videogad-mobile-brand">VideoGad</div>
          </div>

          <div className="videogad-header-main">
            <div>
              <p className="eyebrow">Creator Studio</p>
              <h1>Marketplace Authentication</h1>
              <span>Submit your Supgad store link to unlock Supgad product links while uploading videos.</span>
            </div>

            <div className="videogad-dashboard-header-actions">
              <a href="/creator-dashboard" className="ghost-btn">Back to Dashboard</a>
            </div>
          </div>
        </header>

        {errorMessage ? (
          <div className="watch-inline-message error">{errorMessage}</div>
        ) : null}

        {pageMessage ? (
          <div className="watch-inline-message success">{pageMessage}</div>
        ) : null}

        <section className="videogad-stats-grid">
          <div className="videogad-stat-card">
            <p>Auth Status</p>
            <h3>{authStatus}</h3>
            <span>{isVerified ? 'Supgad store approved' : 'Awaiting verification'}</span>
          </div>

          <div className="videogad-stat-card">
            <p>Store Type</p>
            <h3>Supgad</h3>
            <span>Internal store authentication</span>
          </div>

          <div className="videogad-stat-card">
            <p>Last Verification</p>
            <h3>{lastCheck}</h3>
            <span>Latest verification time</span>
          </div>

          <div className="videogad-stat-card">
            <p>External Plans</p>
            <h3>{plans.length}</h3>
            <span>{externalPlanStatus}</span>
          </div>
        </section>

        <section className="videogad-dashboard-content-grid">
          <div className="videogad-panel large">
            <div className="panel-head">
              <h2>Supgad Store Form</h2>
            </div>

            <form onSubmit={handleSubmit} className="marketplace-auth-form">
              <div className="marketplace-auth-grid">
                <div className="marketplace-auth-field">
                  <label>Store Name</label>
                  <input
                    type="text"
                    name="store_name"
                    value={form.store_name}
                    onChange={handleChange}
                    placeholder="Enter your store name"
                  />
                </div>

                <div className="marketplace-auth-field">
                  <label>Supgad Store URL</label>
                  <input
                    type="text"
                    name="store_url"
                    value={form.store_url}
                    onChange={handleChange}
                    placeholder="https://supgad.com/store/your-store-name"
                  />
                </div>

                <div className="marketplace-auth-field full">
                  <label>What Do You Sell?</label>
                  <input
                    type="text"
                    name="what_they_sell"
                    value={form.what_they_sell}
                    onChange={handleChange}
                    placeholder="Phones, gadgets, fashion, beauty, electronics..."
                  />
                </div>
              </div>

              <div className="marketplace-auth-actions">
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? 'Saving...' : 'Submit for Authentication'}
                </button>
              </div>
            </form>
          </div>

          <div className="videogad-panel">
            <div className="panel-head">
              <h2>Current Auth Record</h2>
            </div>

            <div className="marketplace-status-box">
              <div className="marketplace-row">
                <span>Auth Type</span>
                <strong>{marketplaceAuth?.auth_type || '—'}</strong>
              </div>

              <div className="marketplace-row">
                <span>Saved Store Name</span>
                <strong>{marketplaceAuth?.supgad_account_id || '—'}</strong>
              </div>

              <div className="marketplace-row">
                <span>Saved Store URL</span>
                <strong>{marketplaceAuth?.supgad_store_url || '—'}</strong>
              </div>

              <div className="marketplace-row">
                <span>Supgad Status</span>
                <strong className={isVerified ? 'good' : 'warn'}>
                  {marketplaceAuth?.supgad_status || 'none'}
                </strong>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default CreatorMarketplaceAuthPage;