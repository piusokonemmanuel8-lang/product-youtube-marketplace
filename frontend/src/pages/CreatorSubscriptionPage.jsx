import React, { useEffect, useMemo, useState } from 'react';
import '../creator-dashboard.css';
import {
  getCurrentExternalPostingSubscription,
  getExternalPostingPlans,
  getMyChannel,
} from '../services/creatorDashboardService';

function formatMoney(value, currency = 'USD') {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    return `$${amount.toFixed(2)}`;
  }
}

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

function getStoredToken() {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('videogad_token') ||
    localStorage.getItem('authToken') ||
    ''
  );
}

async function createExternalPlanSubscription(planId) {
  const token = getStoredToken();

  const response = await fetch('/api/creator/external-posting-subscriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      plan_id: planId,
      payment_provider: 'manual',
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || 'Failed to subscribe to plan.');
  }

  return data;
}

async function markExternalPlanPaid(paymentId) {
  const token = getStoredToken();

  const response = await fetch(`/api/creator/external-posting-payments/${paymentId}/mark-paid`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || 'Failed to activate subscription.');
  }

  return data;
}

function CreatorSubscriptionPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [channel, setChannel] = useState(null);
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingPlanId, setSubmittingPlanId] = useState(null);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [theme, setTheme] = useState(
    () => localStorage.getItem('creator_subscription_theme') || 'dark'
  );

  async function loadPage(keepMessage = false) {
    setLoading(true);
    setErrorMessage('');

    if (!keepMessage) {
      setMessage('');
    }

    const [channelResponse, plansResponse, subscriptionResponse] = await Promise.all([
      getMyChannel().catch(() => null),
      getExternalPostingPlans().catch(() => null),
      getCurrentExternalPostingSubscription().catch(() => null),
    ]);

    const channelData =
      channelResponse?.channel || channelResponse?.data || channelResponse || null;

    const plansData =
      plansResponse?.external_posting_plans ||
      plansResponse?.plans ||
      plansResponse?.data ||
      [];

    const subscriptionData =
      subscriptionResponse?.subscription ||
      subscriptionResponse?.data?.subscription ||
      subscriptionResponse?.data ||
      subscriptionResponse ||
      null;

    setChannel(channelData);
    setPlans(Array.isArray(plansData) ? plansData : []);
    setSubscription(subscriptionData);
    setLoading(false);
  }

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    localStorage.setItem('creator_subscription_theme', theme);
  }, [theme]);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('videogad_token');
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }

  async function handleChoosePlan(plan) {
    try {
      setSubmittingPlanId(plan.id);
      setErrorMessage('');
      setMessage('');

      const subscribeResponse = await createExternalPlanSubscription(plan.id);
      const paymentId = subscribeResponse?.payment?.id;

      if (!paymentId) {
        throw new Error('Subscription was created but payment record is missing.');
      }

      await markExternalPlanPaid(paymentId);
      await loadPage(true);

      setMessage(`${plan.name} plan activated successfully.`);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to activate plan.');
    } finally {
      setSubmittingPlanId(null);
    }
  }

  const hasChannel = !!(channel?.id || channel?.channel_name || channel?.name);
  const channelName = channel?.channel_name || channel?.name || 'Creator';
  const channelHandle = channel?.channel_handle || channel?.handle || '';
  const channelSlug = channel?.channel_slug || channel?.slug || '';

  const currentPlanId = Number(subscription?.plan_id || 0);
  const currentPlanStatus = String(subscription?.status || '').toLowerCase();
  const isSubscriptionActive = currentPlanStatus === 'active';

  const isLight = theme === 'light';

  const pageStyles = {
    background: isLight ? '#f3f6fb' : '#050816',
    color: isLight ? '#0f172a' : '#f8fafc',
    minHeight: '100vh',
  };

  const mainStyles = {
    background: isLight
      ? 'linear-gradient(180deg, #ffffff 0%, #eef4ff 100%)'
      : 'linear-gradient(180deg, #030712 0%, #071225 100%)',
    minHeight: '100vh',
  };

  const panelStyles = {
    background: isLight ? '#ffffff' : '#10182b',
    border: isLight ? '1px solid #dbe4f0' : '1px solid rgba(255,255,255,0.08)',
    boxShadow: isLight ? '0 10px 30px rgba(15, 23, 42, 0.08)' : '0 18px 40px rgba(0,0,0,0.25)',
  };

  const subtleTextColor = isLight ? '#475569' : 'rgba(255,255,255,0.75)';
  const titleColor = isLight ? '#0f172a' : '#ffffff';

  const topActionButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '46px',
    padding: '0 18px',
    borderRadius: '14px',
    fontWeight: 700,
    fontSize: '14px',
    textDecoration: 'none',
    border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.16)',
    background: isLight ? '#ffffff' : 'rgba(255,255,255,0.04)',
    color: isLight ? '#0f172a' : '#ffffff',
    boxShadow: isLight ? '0 6px 16px rgba(15, 23, 42, 0.06)' : 'none',
    cursor: 'pointer',
  };

  const planCards = useMemo(() => {
    const planMap = {
      basic: {
        subtitle: 'FOR STARTERS',
        features: [
          'Post external product links',
          'Upload up to 20 videos per month',
          'Full marketplace visibility',
          'Use creator dashboard tools',
          'Best for small sellers starting out',
        ],
      },
      growth: {
        subtitle: 'FOR GROWING SELLERS',
        features: [
          'Post external product links',
          'Upload up to 50 videos per month',
          'Full marketplace visibility',
          'Use creator dashboard tools',
          'Best for active brands and marketers',
        ],
      },
      pro: {
        subtitle: 'FOR LARGE BRANDS',
        features: [
          'Post external product links',
          'Upload up to 100 videos per month',
          'Full marketplace visibility',
          'Use creator dashboard tools',
          'Best for high-volume sellers',
        ],
      },
    };

    return plans.map((plan) => {
      const key = String(plan.name || '').trim().toLowerCase();
      const preset = planMap[key] || {
        subtitle: 'EXTERNAL PLAN',
        features: [
          `Upload up to ${Number(plan.video_limit_per_month || 0)} videos per month`,
          'Post external product links',
          'Full marketplace visibility',
          'Use creator dashboard tools',
        ],
      };

      return {
        ...plan,
        subtitle: preset.subtitle,
        features: preset.features,
      };
    });
  }, [plans]);

  const subscriptionSummary = useMemo(() => {
    return {
      planName: subscription?.plan_name || 'No active plan',
      status: subscription?.status || 'none',
      startsAt: formatDateLabel(subscription?.starts_at),
      endsAt: formatDateLabel(subscription?.ends_at),
      videosUsed: Number(subscription?.videos_used_this_cycle || 0),
      videoLimit: Number(subscription?.video_limit_per_month || 0),
    };
  }, [subscription]);

  if (loading) {
    return (
      <div className="videogad-dashboard-page" style={pageStyles}>
        <main className="videogad-dashboard-main" style={mainStyles}>
          <div className="videogad-panel" style={panelStyles}>
            <h2>Loading subscription plans...</h2>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="videogad-dashboard-page" style={pageStyles}>
      <aside
        className={`videogad-dashboard-sidebar ${menuOpen ? 'open' : ''}`}
        style={{
          background: isLight ? '#ffffff' : '#0b1325',
          borderRight: isLight ? '1px solid #dbe4f0' : '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="videogad-sidebar-top">
          <div className="videogad-brand" style={{ color: titleColor }}>VideoGad</div>

          <button
            className="videogad-close-menu"
            onClick={() => setMenuOpen(false)}
            type="button"
            style={{ color: titleColor }}
          >
            ✕
          </button>
        </div>

        <nav className="videogad-dashboard-nav">
          <a href="/creator-dashboard" style={{ color: titleColor }}>Dashboard</a>
          <a href="/create-channel" style={{ color: titleColor }}>
            {hasChannel ? 'Edit Channel' : 'Create Channel'}
          </a>
          <a href="/upload-video" style={{ color: titleColor }}>Upload Video</a>
          <a href="/my-videos" style={{ color: titleColor }}>My Videos</a>
          <a href="/creator-analytics" style={{ color: titleColor }}>Analytics</a>
          <a href="/creator-ads" style={{ color: titleColor }}>Ads</a>
          <a href="/creator-ads-analytics" style={{ color: titleColor }}>Ads Analytics</a>
          <a href="/creator-wallet" style={{ color: titleColor }}>Wallet</a>
          <a href="/creator-earnings" style={{ color: titleColor }}>Earnings</a>
          <a href="/creator-payout" style={{ color: titleColor }}>Payout</a>
          <a
            href="/creator-subscription"
            className="active"
            style={{
              color: titleColor,
              background: isLight ? '#e8f0ff' : undefined,
            }}
          >
            Subscription
          </a>

          {hasChannel ? (
            <div
              className="creator-channel-box"
              style={{
                background: isLight ? '#f8fbff' : undefined,
                border: isLight ? '1px solid #dbe4f0' : undefined,
              }}
            >
              <p className="creator-channel-label" style={{ color: subtleTextColor }}>Your Channel</p>
              <h4 style={{ color: titleColor }}>{channelName}</h4>
              <span style={{ color: subtleTextColor }}>{channelHandle}</span>
              <small style={{ color: subtleTextColor }}>{channelSlug}</small>
            </div>
          ) : null}

          <a
            href="/creator-marketplace-auth"
            className="creator-sidebar-auth-box"
            style={{
              background: isLight ? '#f8fbff' : undefined,
              border: isLight ? '1px solid #dbe4f0' : undefined,
            }}
          >
            <p className="creator-channel-label" style={{ color: subtleTextColor }}>Authentication</p>
            <h4 style={{ color: titleColor }}>Marketplace Auth</h4>
            <span style={{ color: subtleTextColor }}>Connect Supgad or manage external access</span>
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

      <main className="videogad-dashboard-main" style={mainStyles}>
        <header className="videogad-dashboard-header">
          <div className="videogad-mobile-topbar">
            <button
              className="videogad-menu-toggle"
              onClick={() => setMenuOpen(true)}
              type="button"
              style={{ color: titleColor }}
            >
              ☰
            </button>
            <div className="videogad-mobile-brand" style={{ color: titleColor }}>VideoGad</div>
          </div>

          <div className="videogad-header-main">
            <div>
              <p className="eyebrow" style={{ color: subtleTextColor }}>CREATOR STUDIO</p>
              <h1 style={{ color: titleColor }}>Choose Your Subscription</h1>
              <span style={{ color: subtleTextColor }}>
                Pick the package that fits your external product link uploads.
              </span>
            </div>

            <div
              className="videogad-dashboard-header-actions"
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                minWidth: '320px',
              }}
            >
              <button
                type="button"
                onClick={() => setTheme(isLight ? 'dark' : 'light')}
                style={topActionButtonStyle}
              >
                {isLight ? 'Switch to Dark' : 'Switch to Light'}
              </button>

              <a href="/creator-dashboard" style={topActionButtonStyle}>
                Back to Dashboard
              </a>
            </div>
          </div>
        </header>

        {errorMessage ? (
          <div className="watch-inline-message error">{errorMessage}</div>
        ) : null}

        {message ? (
          <div className="watch-inline-message success">{message}</div>
        ) : null}

        <section className="videogad-stats-grid">
          <div className="videogad-stat-card" style={panelStyles}>
            <p style={{ color: subtleTextColor }}>Current Plan</p>
            <h3 style={{ color: titleColor }}>{subscriptionSummary.planName}</h3>
            <span style={{ color: subtleTextColor }}>
              {isSubscriptionActive ? 'Active subscription' : 'No active subscription'}
            </span>
          </div>

          <div className="videogad-stat-card" style={panelStyles}>
            <p style={{ color: subtleTextColor }}>Status</p>
            <h3 style={{ color: titleColor }}>{subscriptionSummary.status}</h3>
            <span style={{ color: subtleTextColor }}>Subscription state</span>
          </div>

          <div className="videogad-stat-card" style={panelStyles}>
            <p style={{ color: subtleTextColor }}>Monthly Usage</p>
            <h3 style={{ color: titleColor }}>
              {subscriptionSummary.videosUsed}/{subscriptionSummary.videoLimit || 0}
            </h3>
            <span style={{ color: subtleTextColor }}>External video uploads used</span>
          </div>

          <div className="videogad-stat-card" style={panelStyles}>
            <p style={{ color: subtleTextColor }}>Expires</p>
            <h3 style={{ color: titleColor }}>{subscriptionSummary.endsAt}</h3>
            <span style={{ color: subtleTextColor }}>Renew before it ends</span>
          </div>
        </section>

        <section
          className="videogad-panel large"
          style={{
            ...panelStyles,
            paddingTop: '26px',
          }}
        >
          <div className="panel-head" style={{ marginBottom: '20px' }}>
            <h2 style={{ color: titleColor, opacity: 1, visibility: 'visible' }}>
              Subscription Packages
            </h2>
          </div>

          <div
            className="subscription-packages-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            {planCards.length ? (
              planCards.map((plan) => {
                const isCurrent = currentPlanId === Number(plan.id) && isSubscriptionActive;
                const isLoadingPlan = submittingPlanId === plan.id;

                return (
                  <div
                    key={plan.id}
                    className="subscription-package-card"
                    style={{
                      background: isLight ? '#ffffff' : '#08142b',
                      border: isCurrent
                        ? '1px solid #22c55e'
                        : isLight
                          ? '1px solid #dbe4f0'
                          : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '20px',
                      padding: '28px 22px',
                      boxShadow: isLight
                        ? '0 14px 34px rgba(15, 23, 42, 0.08)'
                        : '0 16px 40px rgba(0,0,0,0.25)',
                      transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.04)';
                      e.currentTarget.style.boxShadow = isLight
                        ? '0 22px 44px rgba(15, 23, 42, 0.14)'
                        : '0 24px 50px rgba(0,0,0,0.35)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = isLight
                        ? '0 14px 34px rgba(15, 23, 42, 0.08)'
                        : '0 16px 40px rgba(0,0,0,0.25)';
                    }}
                  >
                    <div style={{ marginBottom: '18px' }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '12px',
                          color: subtleTextColor,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          fontWeight: 700,
                        }}
                      >
                        {plan.subtitle}
                      </p>
                      <h3
                        style={{
                          margin: '8px 0 6px',
                          fontSize: '28px',
                          color: titleColor,
                        }}
                      >
                        {plan.name}
                      </h3>
                      <div
                        style={{
                          fontSize: '30px',
                          fontWeight: 700,
                          color: titleColor,
                        }}
                      >
                        {formatMoney(plan.price, plan.currency_code || 'USD')}
                        <span style={{ fontSize: '14px', color: subtleTextColor, marginLeft: '6px' }}>
                          /month
                        </span>
                      </div>
                    </div>

                    <div style={{ marginBottom: '22px' }}>
                      {plan.features.map((feature) => (
                        <div
                          key={`${plan.id}-${feature}`}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            marginBottom: '12px',
                            fontSize: '14px',
                            lineHeight: '1.5',
                            color: titleColor,
                          }}
                        >
                          <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => handleChoosePlan(plan)}
                      disabled={isLoadingPlan || isCurrent}
                      style={{ width: '100%' }}
                    >
                      {isCurrent ? 'Current Plan' : isLoadingPlan ? 'Processing...' : 'Subscribe'}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="dashboard-empty-box">No subscription plans available yet.</div>
            )}
          </div>
        </section>

        <section className="videogad-dashboard-content-grid lower">
          <div className="videogad-panel" style={panelStyles}>
            <div className="panel-head">
              <h2 style={{ color: titleColor, opacity: 1, visibility: 'visible' }}>Important Rules</h2>
            </div>

            <div
              className="marketplace-status-box"
              style={{
                background: isLight ? '#f8fbff' : '#08142b',
                border: isLight ? '1px solid #dbe4f0' : undefined,
              }}
            >
              <div className="marketplace-row">
                <span style={{ color: subtleTextColor }}>External links</span>
                <strong style={{ color: titleColor }}>Require active subscription</strong>
              </div>

              <div className="marketplace-row">
                <span style={{ color: subtleTextColor }}>Expired plan</span>
                <strong style={{ color: titleColor }}>External videos go to draft</strong>
              </div>

              <div className="marketplace-row">
                <span style={{ color: subtleTextColor }}>Renewed plan</span>
                <strong style={{ color: titleColor }}>Approved videos return live</strong>
              </div>

              <div className="marketplace-row">
                <span style={{ color: subtleTextColor }}>Upload limit</span>
                <strong style={{ color: titleColor }}>Based on selected package</strong>
              </div>
            </div>
          </div>

          <div className="videogad-panel" style={panelStyles}>
            <div className="panel-head">
              <h2 style={{ color: titleColor, opacity: 1, visibility: 'visible' }}>Current Subscription</h2>
            </div>

            <div
              className="marketplace-status-box"
              style={{
                background: isLight ? '#f8fbff' : '#08142b',
                border: isLight ? '1px solid #dbe4f0' : undefined,
              }}
            >
              <div className="marketplace-row">
                <span style={{ color: subtleTextColor }}>Plan</span>
                <strong style={{ color: titleColor }}>{subscriptionSummary.planName}</strong>
              </div>

              <div className="marketplace-row">
                <span style={{ color: subtleTextColor }}>Status</span>
                <strong style={{ color: titleColor }}>{subscriptionSummary.status}</strong>
              </div>

              <div className="marketplace-row">
                <span style={{ color: subtleTextColor }}>Started</span>
                <strong style={{ color: titleColor }}>{subscriptionSummary.startsAt}</strong>
              </div>

              <div className="marketplace-row">
                <span style={{ color: subtleTextColor }}>Ends</span>
                <strong style={{ color: titleColor }}>{subscriptionSummary.endsAt}</strong>
              </div>

              <div className="marketplace-row">
                <span style={{ color: subtleTextColor }}>Usage</span>
                <strong style={{ color: titleColor }}>
                  {subscriptionSummary.videosUsed}/{subscriptionSummary.videoLimit || 0}
                </strong>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default CreatorSubscriptionPage;