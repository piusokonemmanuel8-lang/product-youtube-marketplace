import React, { useEffect, useState } from 'react';
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
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminLoginPage from './pages/AdminLoginPage';

function App() {
  const getCurrentPath = () => {
    const rawPath = window.location.pathname || '/';
    const normalizedPath = rawPath.replace(/\/+$/, '') || '/';
    return normalizedPath;
  };

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
    return <CreatorEarningsPage />;
  }

  if (path === '/creator-payout') {
    return <CreatorPayoutPage />;
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