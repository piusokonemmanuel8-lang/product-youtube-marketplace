import React from 'react';
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
import CreatorEarningsPage from './pages/CreatorEarningsPage';
import CreatorPayoutPage from './pages/CreatorPayoutPage';

function App() {
  const path = window.location.pathname;

  if (path === '/login') {
    return <LoginPage />;
  }

  if (path === '/register') {
    return <RegisterPage />;
  }

  if (path === '/watch') {
    return <WatchPage />;
  }

  if (path === '/channel') {
    return <ChannelPage />;
  }

  if (path === '/creator-dashboard') {
    return <CreatorDashboardPage />;
  }

  if (path === '/become-creator') {
    return <BecomeCreatorPage />;
  }

  if (path === '/create-channel') {
    return <CreateChannelPage />;
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

  if (path === '/creator-earnings') {
    return <CreatorEarningsPage />;
  }

  if (path === '/creator-payout') {
    return <CreatorPayoutPage />;
  }

  return <HomePage />;
}

export default App;