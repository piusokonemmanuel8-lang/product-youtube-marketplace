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

import TermsOfServicePage from './pages/legal/TermsOfServicePage';
import PrivacyPolicyPage from './pages/legal/PrivacyPolicyPage';
import CreatorTermsPage from './pages/legal/CreatorTermsPage';
import VendorTermsPage from './pages/legal/VendorTermsPage';
import MonetizationPolicyPage from './pages/legal/MonetizationPolicyPage';
import CommunityGuidelinesPage from './pages/legal/CommunityGuidelinesPage';
import ProhibitedContentPage from './pages/legal/ProhibitedContentPage';
import RefundPolicyPage from './pages/legal/RefundPolicyPage';
import ContactPage from './pages/support/ContactPage';
import AboutPage from './pages/company/AboutPage';
import HowItWorksPage from './pages/company/HowItWorksPage';

import Footer from './components/Footer';
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

function PageWithFooter({ children }) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
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
    return (
      <PageWithFooter>
        <CreatorMarketplaceAuthPage />
      </PageWithFooter>
    );
  }

  if (path === '/creator-subscription') {
    return (
      <PageWithFooter>
        <CreatorSubscriptionPage />
      </PageWithFooter>
    );
  }

  if (path === '/creator-support') {
    return (
      <PageWithFooter>
        <CreatorSupportPage />
      </PageWithFooter>
    );
  }

  if (path === '/creator-monetization') {
    return (
      <PageWithFooter>
        <CreatorMonetizationPage />
      </PageWithFooter>
    );
  }

  if (path === '/creator-dashboard') {
    return (
      <PageWithFooter>
        <CreatorDashboardPage />
      </PageWithFooter>
    );
  }

  if (path === '/create-channel') {
    return (
      <PageWithFooter>
        <CreateChannelPage />
      </PageWithFooter>
    );
  }

  if (path === '/become-creator') {
    return (
      <PageWithFooter>
        <BecomeCreatorPage />
      </PageWithFooter>
    );
  }

  if (path === '/upload-video') {
    return (
      <PageWithFooter>
        <UploadVideoPage />
      </PageWithFooter>
    );
  }

  if (path === '/my-videos') {
    return (
      <PageWithFooter>
        <MyVideosPage />
      </PageWithFooter>
    );
  }

  if (path === '/creator-analytics') {
    return (
      <PageWithFooter>
        <CreatorAnalyticsPage />
      </PageWithFooter>
    );
  }

  if (path === '/creator-ads') {
    return (
      <PageWithFooter>
        <CreatorAdsPage />
      </PageWithFooter>
    );
  }

  if (path === '/creator-ads-analytics') {
    return (
      <PageWithFooter>
        <CreatorAdsAnalyticsPage />
      </PageWithFooter>
    );
  }

  if (path === '/creator-wallet') {
    return (
      <PageWithFooter>
        <CreatorWalletPage />
      </PageWithFooter>
    );
  }

  if (path === '/creator-earnings') {
    return (
      <PageWithFooter>
        <MonetizedOnlyRoute featureTitle="Earnings">
          <CreatorEarningsPage />
        </MonetizedOnlyRoute>
      </PageWithFooter>
    );
  }

  if (path === '/creator-payout') {
    return (
      <PageWithFooter>
        <MonetizedOnlyRoute featureTitle="Payout">
          <CreatorPayoutPage />
        </MonetizedOnlyRoute>
      </PageWithFooter>
    );
  }

  if (path === '/terms') {
    return (
      <PageWithFooter>
        <TermsOfServicePage />
      </PageWithFooter>
    );
  }

  if (path === '/privacy') {
    return (
      <PageWithFooter>
        <PrivacyPolicyPage />
      </PageWithFooter>
    );
  }

  if (path === '/creator-terms') {
    return (
      <PageWithFooter>
        <CreatorTermsPage />
      </PageWithFooter>
    );
  }

  if (path === '/vendor-terms') {
    return (
      <PageWithFooter>
        <VendorTermsPage />
      </PageWithFooter>
    );
  }

  if (path === '/monetization-policy') {
    return (
      <PageWithFooter>
        <MonetizationPolicyPage />
      </PageWithFooter>
    );
  }

  if (path === '/community-guidelines') {
    return (
      <PageWithFooter>
        <CommunityGuidelinesPage />
      </PageWithFooter>
    );
  }

  if (path === '/prohibited-content') {
    return (
      <PageWithFooter>
        <ProhibitedContentPage />
      </PageWithFooter>
    );
  }

  if (path === '/refund-policy') {
    return (
      <PageWithFooter>
        <RefundPolicyPage />
      </PageWithFooter>
    );
  }

  if (path === '/contact') {
    return (
      <PageWithFooter>
        <ContactPage />
      </PageWithFooter>
    );
  }

  if (path === '/about') {
    return (
      <PageWithFooter>
        <AboutPage />
      </PageWithFooter>
    );
  }

  if (path === '/how-it-works') {
    return (
      <PageWithFooter>
        <HowItWorksPage />
      </PageWithFooter>
    );
  }

  if (path === '/login') {
    return (
      <PageWithFooter>
        <LoginPage />
      </PageWithFooter>
    );
  }

  if (path === '/register') {
    return (
      <PageWithFooter>
        <RegisterPage />
      </PageWithFooter>
    );
  }

  if (path.startsWith('/watch/')) {
    return (
      <PageWithFooter>
        <WatchPage />
      </PageWithFooter>
    );
  }

  if (path === '/watch') {
    return (
      <PageWithFooter>
        <WatchPage />
      </PageWithFooter>
    );
  }

  if (path.startsWith('/channel/')) {
    return (
      <PageWithFooter>
        <ChannelPage />
      </PageWithFooter>
    );
  }

  if (path === '/channel') {
    return (
      <PageWithFooter>
        <ChannelPage />
      </PageWithFooter>
    );
  }

  return (
    <PageWithFooter>
      <HomePage />
    </PageWithFooter>
  );
}

export default App;