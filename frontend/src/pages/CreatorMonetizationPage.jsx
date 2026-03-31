import React, { useEffect, useMemo, useState } from 'react';
import '../creator-dashboard.css';
import {
  applyForMonetization,
  getCreatorMonetizationEligibility,
  getMyMonetizationApplication,
} from '../services/creatorDashboardService';

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatHours(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getStatusClass(status) {
  return String(status || 'pending').toLowerCase().replace(/\s+/g, '-');
}

function normalizeEligibilityResponse(payload) {
  const source = payload?.data && typeof payload.data === 'object' ? payload.data : payload;

  return {
    creator_profile: source?.creator_profile || null,
    monetization_status: source?.monetization_status || null,
    latest_application: source?.latest_application || null,
    eligibility: source?.eligibility || null,
  };
}

function normalizeApplicationResponse(payload) {
  const source = payload?.data && typeof payload.data === 'object' ? payload.data : payload;

  return {
    monetization_status: source?.monetization_status || null,
    application: source?.application || null,
  };
}

function RequirementRow({ label, current, target, met, suffix = '' }) {
  return (
    <div className="marketplace-row">
      <span>{label}</span>
      <strong className={met ? 'good' : 'warn'}>
        {formatNumber(current)}
        {suffix}
        {target !== null && target !== undefined ? ` / ${formatNumber(target)}${suffix}` : ''}
      </strong>
    </div>
  );
}

function CreatorMonetizationPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [eligibilityData, setEligibilityData] = useState(null);
  const [applicationData, setApplicationData] = useState(null);
  const [appliedMessage, setAppliedMessage] = useState('');

  useEffect(() => {
    loadMonetizationData();
  }, []);

  async function loadMonetizationData() {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const [eligibilityResponse, applicationResponse] = await Promise.all([
        getCreatorMonetizationEligibility().catch(() => null),
        getMyMonetizationApplication().catch(() => null),
      ]);

      setEligibilityData(normalizeEligibilityResponse(eligibilityResponse || {}));
      setApplicationData(normalizeApplicationResponse(applicationResponse || {}));
    } catch (err) {
      setError(err.message || 'Failed to load monetization page.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApply(event) {
    event.preventDefault();

    if (!eligibilityData?.eligibility?.is_eligible) {
      setError('You are not yet eligible for monetization.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      await applyForMonetization({
        applied_message: appliedMessage.trim(),
      });

      setAppliedMessage('');
      setSuccessMessage('Monetization application submitted successfully.');
      await loadMonetizationData();
    } catch (err) {
      setError(err.message || 'Failed to submit monetization application.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('videogad_token');
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }

  const eligibility = eligibilityData?.eligibility || {};
  const thresholds = eligibility?.thresholds || {};
  const progress = eligibility?.progress || {};
  const checks = eligibility?.checks || {};
  const latestApplication =
    applicationData?.application || eligibilityData?.latest_application || null;
  const monetizationStatus =
    applicationData?.monetization_status || eligibilityData?.monetization_status || null;

  const hasPendingApplication =
    String(latestApplication?.status || '').toLowerCase() === 'pending';

  const alreadyMonetized =
    monetizationStatus?.is_monetized === 1 ||
    monetizationStatus?.is_monetized === true;

  const checklist = useMemo(() => {
    return [
      {
        label: 'Subscribers',
        current: Number(progress?.total_subscribers || 0),
        target: Number(thresholds?.min_subscribers || 1000),
        met: !!checks?.subscribers_met,
      },
      {
        label: 'Total Public Video Views',
        current: Number(progress?.total_video_views || 0),
        target: Number(thresholds?.min_total_video_views || 10000),
        met: !!checks?.total_video_views_met,
      },
      {
        label: 'Watch Hours',
        current: Number(progress?.total_watch_hours || 0),
        target: Number(thresholds?.min_watch_hours || 500),
        met: !!checks?.watch_hours_met,
        suffix: 'h',
      },
      {
        label: 'External Posting Subscription',
        current: progress?.has_active_external_subscription ? 1 : 0,
        target: 1,
        met: !!checks?.external_subscription_met,
        isBoolean: true,
      },
    ];
  }, [progress, thresholds, checks]);

  if (loading) {
    return (
      <div className="videogad-dashboard-page">
        <main className="videogad-dashboard-main">
          <div className="videogad-panel">
            <h2>Loading monetization page...</h2>
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
          <a href="/create-channel">Edit Channel</a>
          <a href="/upload-video">Upload Video</a>
          <a href="/my-videos">My Videos</a>
          <a href="/creator-analytics">Analytics</a>
          <a href="/creator-support">Support Chat</a>
          <a href="/creator-monetization" className="active">Monetization</a>
          <a href="/creator-ads">Ads</a>
          <a href="/creator-ads-analytics">Ads Analytics</a>
          <a href="/creator-wallet">Wallet</a>
          <a href="/creator-earnings">Earnings</a>
          <a href="/creator-payout">Payout</a>
          <a href="/creator-subscription">Subscription</a>
          <a href="/account-settings">Settings</a>

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
              <h1>Monetization</h1>
              <span>Meet the requirements, then apply for monetization approval.</span>
            </div>

            <div className="videogad-dashboard-header-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={loadMonetizationData}
              >
                Refresh
              </button>
              <a href="/creator-dashboard" className="ghost-btn">Back to Dashboard</a>
            </div>
          </div>
        </header>

        {error ? (
          <div className="admin-alert error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="admin-alert success" style={{ marginBottom: 16 }}>
            {successMessage}
          </div>
        ) : null}

        <section className="videogad-stats-grid">
          <div className="videogad-stat-card">
            <p>Subscribers</p>
            <h3>{formatNumber(progress?.total_subscribers || 0)}</h3>
            <span>Need {formatNumber(thresholds?.min_subscribers || 1000)}</span>
          </div>

          <div className="videogad-stat-card">
            <p>Total Public Views</p>
            <h3>{formatNumber(progress?.total_video_views || 0)}</h3>
            <span>Need {formatNumber(thresholds?.min_total_video_views || 10000)}</span>
          </div>

          <div className="videogad-stat-card">
            <p>Watch Hours</p>
            <h3>{formatHours(progress?.total_watch_hours || 0)}h</h3>
            <span>Need {formatNumber(thresholds?.min_watch_hours || 500)}h</span>
          </div>

          <div className="videogad-stat-card">
            <p>External Subscription</p>
            <h3>{progress?.has_active_external_subscription ? 'Active' : 'Inactive'}</h3>
            <span>Required for monetization</span>
          </div>
        </section>

        <section className="videogad-dashboard-content-grid">
          <div className="videogad-panel large">
            <div className="panel-head">
              <h2>Eligibility Checklist</h2>
            </div>

            <div className="marketplace-status-box">
              <RequirementRow
                label="Subscribers"
                current={progress?.total_subscribers || 0}
                target={thresholds?.min_subscribers || 1000}
                met={checks?.subscribers_met}
              />

              <RequirementRow
                label="Total Public Video Views"
                current={progress?.total_video_views || 0}
                target={thresholds?.min_total_video_views || 10000}
                met={checks?.total_video_views_met}
              />

              <RequirementRow
                label="Watch Hours"
                current={progress?.total_watch_hours || 0}
                target={thresholds?.min_watch_hours || 500}
                met={checks?.watch_hours_met}
                suffix="h"
              />

              <div className="marketplace-row">
                <span>External Posting Subscription</span>
                <strong className={checks?.external_subscription_met ? 'good' : 'warn'}>
                  {progress?.has_active_external_subscription ? 'Active' : 'Inactive'}
                </strong>
              </div>

              <div className="marketplace-row">
                <span>Overall Eligibility</span>
                <strong className={eligibility?.is_eligible ? 'good' : 'warn'}>
                  {eligibility?.is_eligible ? 'Eligible to Apply' : 'Not Yet Eligible'}
                </strong>
              </div>
            </div>
          </div>

          <div className="videogad-panel">
            <div className="panel-head">
              <h2>Current Status</h2>
            </div>

            <div className="marketplace-status-box">
              <div className="marketplace-row">
                <span>Monetized</span>
                <strong className={alreadyMonetized ? 'good' : 'warn'}>
                  {alreadyMonetized ? 'Yes' : 'No'}
                </strong>
              </div>

              <div className="marketplace-row">
                <span>Latest Application</span>
                <strong>
                  {latestApplication?.status
                    ? String(latestApplication.status).toUpperCase()
                    : 'No Application Yet'}
                </strong>
              </div>

              <div className="marketplace-row">
                <span>Application Subscribers</span>
                <strong>{formatNumber(latestApplication?.subscriber_count || 0)}</strong>
              </div>

              <div className="marketplace-row">
                <span>Application Views</span>
                <strong>{formatNumber(latestApplication?.total_video_views || 0)}</strong>
              </div>

              <div className="marketplace-row">
                <span>Application Watch Hours</span>
                <strong>{formatHours(latestApplication?.total_watch_hours || 0)}h</strong>
              </div>

              {latestApplication?.admin_note ? (
                <div className="marketplace-row">
                  <span>Admin Note</span>
                  <strong>{latestApplication.admin_note}</strong>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="videogad-dashboard-content-grid">
          <div className="videogad-panel large">
            <div className="panel-head">
              <h2>Apply for Monetization</h2>
            </div>

            {alreadyMonetized ? (
              <div className="dashboard-empty-box">
                Your channel is already monetized.
              </div>
            ) : hasPendingApplication ? (
              <div className="dashboard-empty-box">
                You already have a pending monetization application.
              </div>
            ) : !eligibility?.is_eligible ? (
              <div className="dashboard-empty-box">
                Meet all the requirements first before applying.
              </div>
            ) : (
              <form className="admin-form" onSubmit={handleApply}>
                <textarea
                  className="admin-input admin-textarea"
                  placeholder="Optional note for admin..."
                  value={appliedMessage}
                  onChange={(e) => setAppliedMessage(e.target.value)}
                  rows={5}
                />

                <div className="admin-actions">
                  <button
                    type="submit"
                    className="admin-btn success"
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Apply for Monetization'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="videogad-panel">
            <div className="panel-head">
              <h2>Requirements</h2>
            </div>

            <div className="marketplace-status-box">
              {checklist.map((item) => (
                <div className="marketplace-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong className={item.met ? 'good' : 'warn'}>
                    {item.isBoolean
                      ? item.met
                        ? 'Met'
                        : 'Not Met'
                      : `${item.current}${item.suffix || ''} / ${item.target}${item.suffix || ''}`}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default CreatorMonetizationPage;