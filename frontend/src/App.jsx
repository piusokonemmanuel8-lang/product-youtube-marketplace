import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import WatchPage from './pages/WatchPage';
import ChannelPage from './pages/ChannelPage';
import CreatorDashboardPage from './pages/CreatorDashboardPage';
import CreateChannelPage from './pages/CreateChannelPage';
import BecomeCreatorPage from './pages/BecomeCreatorPage';
import UploadVideoPage from './pages/UploadVideoPage';
import MyVideosPage from './pages/MyVideosPage';
import CreatorAnalyticsPage from './pages/CreatorAnalyticsPage';
import CreatorAdsPage from './pages/CreatorAdsPage';
import CreatorAdsAnalyticsPage from './pages/CreatorAdsAnalyticsPage';
import CreatorWalletPage from './pages/CreatorWalletPage';
import CreatorEarningsPage from './pages/CreatorEarningsPage';
import CreatorPayoutPage from './pages/CreatorPayoutPage';
import CreatorMarketplaceAuthPage from './pages/CreatorMarketplaceAuthPage';
import CreatorSubscriptionPage from './pages/CreatorSubscriptionPage';
import CreatorSupportPage from './pages/CreatorSupportPage';
import CreatorMonetizationPage from './pages/CreatorMonetizationPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminLoginPage from './pages/AdminLoginPage';
import { getCreatorMonetizationEligibility } from './services/creatorDashboardService';

function getCurrentPath() {
  const rawPath = window.location.pathname || '/';
  return rawPath.replace(/\/+$/, '') || '/';
}

function extractEligibilitySource(payload) {
  if (payload?.data && typeof payload.data === 'object') return payload.data;
  return payload || {};
}

function isCreatorMonetized(payload) {
  const source = extractEligibilitySource(payload);

  const monetizationStatus = source?.monetization_status || {};
  const creatorProfile = source?.creator_profile || {};
  const latestApplication = source?.latest_application || {};

  return (
    monetizationStatus?.is_monetized === true ||
    monetizationStatus?.is_monetized === 1 ||
    creatorProfile?.is_monetized === true ||
    creatorProfile?.is_monetized === 1 ||
    String(monetizationStatus?.status || '').toLowerCase() === 'approved' ||
    String(monetizationStatus?.status || '').toLowerCase() === 'monetized' ||
    String(creatorProfile?.monetization_status || '').toLowerCase() === 'approved' ||
    String(creatorProfile?.monetization_status || '').toLowerCase() === 'monetized' ||
    String(latestApplication?.status || '').toLowerCase() === 'approved'
  );
}

function MonetizationLockedPage({ featureTitle = 'This page' }) {
  return (
    <div className="monetization-lock-page">
      <div className="monetization-lock-card">
        <div className="monetization-lock-badge">Creator Access</div>
        <h1>{featureTitle} is for monetized creators</h1>
        <p>
          Unfortunately, your account is not monetized yet. Check your current level
          status and eligibility to unlock this page.
        </p>

        <div className="monetization-lock-actions">
          <a href="/creator-monetization" className="primary-btn">
            Check Current Level Status
          </a>
          <a href="/creator-dashboard" className="ghost-btn">
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

function MonetizedOnlyRoute({ children, featureTitle }) {
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      setLoading(true);

      try {
        const response = await getCreatorMonetizationEligibility();
        if (!mounted) return;
        setIsAllowed(isCreatorMonetized(response));
      } catch (error) {
        if (!mounted) return;
        setIsAllowed(false);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, []);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="monetization-lock-page">
          <div className="monetization-lock-card">
            <div className="monetization-lock-badge">Checking Access</div>
            <h1>Please wait</h1>
            <p>We are checking your monetization status.</p>
          </div>
        </div>
      );
    }

    if (!isAllowed) {
      return <MonetizationLockedPage featureTitle={featureTitle} />;
    }

    return children;
  }, [children, featureTitle, isAllowed, loading]);

  return content;
}

function App() {
  const [path, setPath] = useState(getCurrentPath());

  useEffect(() => {
    const updatePath = () => {
      setPath(getCurrentPath());
    };

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      originalPushState.apply(window.history, args);
      updatePath();
    };

    window.history.replaceState = function (...args) {
      originalReplaceState.apply(window.history, args);
      updatePath();
    };

    window.addEventListener('popstate', updatePath);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', updatePath);
    };
  }, []);

  if (path === '/admin-login') {
    return <AdminLoginPage />;
  }

  if (path === '/admin-dashboard') {
    return <AdminDashboardPage />;
  }

  if (path === '/creator-marketplace-auth') {
    return <CreatorMarketplaceAuthPage />;
  }

  if (path === '/creator-subscription') {
    return <CreatorSubscriptionPage />;
  }

  if (path === '/creator-support') {
    return <CreatorSupportPage />;
  }

  if (path === '/creator-monetization') {
    return <CreatorMonetizationPage />;
  }

  if (path === '/creator-dashboard') {
    return <CreatorDashboardPage />;
  }

  if (path === '/create-channel') {
    return <CreateChannelPage />;
  }

  if (path === '/become-creator') {
    return <BecomeCreatorPage />;
  }

  if (path === '/upload-video') {
    return <UploadVideoPage />;
  }

  if (path === '/my-videos') {
    return <MyVideosPage />;
  }

  if (path === '/creator-analytics') {
    return <CreatorAnalyticsPage />;
  }

  if (path === '/creator-ads') {
    return <CreatorAdsPage />;
  }

  if (path === '/creator-ads-analytics') {
    return <CreatorAdsAnalyticsPage />;
  }

  if (path === '/creator-wallet') {
    return <CreatorWalletPage />;
  }

  if (path === '/creator-earnings') {
    return (
      <MonetizedOnlyRoute featureTitle="Earnings">
        <CreatorEarningsPage />
      </MonetizedOnlyRoute>
    );
  }

  if (path === '/creator-payout') {
    return (
      <MonetizedOnlyRoute featureTitle="Payout">
        <CreatorPayoutPage />
      </MonetizedOnlyRoute>
    );
  }

  if (path === '/login') {
    return <LoginPage />;
  }

  if (path === '/register') {
    return <RegisterPage />;
  }

  if (path.startsWith('/watch/')) {
    return <WatchPage />;
  }

  if (path === '/watch') {
    return <WatchPage />;
  }

  if (path.startsWith('/channel/')) {
    return <ChannelPage />;
  }

  if (path === '/channel') {
    return <ChannelPage />;
  }

  return <HomePage />;
}

export default App;