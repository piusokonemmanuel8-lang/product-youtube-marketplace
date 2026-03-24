console.log('LOADED APP FILE FROM SRC/APP.JS');

const express = require('express');
const authRoutes = require('./routes/authRoutes');
const channelRoutes = require('./routes/channelRoutes');
const channelSubscriptionRoutes = require('./routes/channelSubscriptionRoutes');
const videoRoutes = require('./routes/videoRoutes');
const videoReactionRoutes = require('./routes/videoReactionRoutes');
const commentRoutes = require('./routes/commentRoutes');
const watchHistoryRoutes = require('./routes/watchHistoryRoutes');
const savedVideoRoutes = require('./routes/savedVideoRoutes');
const creatorDashboardRoutes = require('./routes/creatorDashboardRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const moderationRoutes = require('./routes/moderationRoutes');
const payoutRoutes = require('./routes/payoutRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const tagRoutes = require('./routes/tagRoutes');
const shareRoutes = require('./routes/shareRoutes');
const viewerProfileRoutes = require('./routes/viewerProfileRoutes');
const publicWatchRoutes = require('./routes/publicWatchRoutes');
const marketplaceAuthRoutes = require('./routes/marketplaceAuthRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const adRoutes = require('./routes/adRoutes');
const adVideoRoutes = require('./routes/adVideoRoutes');
const adPlayerRoutes = require('./routes/adPlayerRoutes');
const adApprovalRoutes = require('./routes/adApprovalRoutes');
const adTrackingRoutes = require('./routes/adTrackingRoutes');
const adClickRoutes = require('./routes/adClickRoutes');
const adReportRoutes = require('./routes/adReportRoutes');
const adSkipRoutes = require('./routes/adSkipRoutes');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'API is running',
  });
});

app.get('/api/auth/test-root', (req, res) => {
  res.json({
    message: 'APP auth root works',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api', videoReactionRoutes);
app.use('/api', commentRoutes);
app.use('/api', channelSubscriptionRoutes);
app.use('/api', watchHistoryRoutes);
app.use('/api', savedVideoRoutes);
app.use('/api', creatorDashboardRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', moderationRoutes);
app.use('/api', payoutRoutes);
app.use('/api', notificationRoutes);
app.use('/api', tagRoutes);
app.use('/api', shareRoutes);
app.use('/api', viewerProfileRoutes);
app.use('/api', publicWatchRoutes);
app.use('/api', marketplaceAuthRoutes);
app.use('/api', categoryRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/ads', adVideoRoutes);
app.use('/api/ads', adPlayerRoutes);
app.use('/api/ads', adApprovalRoutes);
app.use('/api/ads', adTrackingRoutes);
app.use('/api/ads', adClickRoutes);
app.use('/api/ads', adReportRoutes);
app.use('/api/ads', adSkipRoutes);

module.exports = app;