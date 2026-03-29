console.log('LOADED APP FILE FROM SRC/APP.JS');

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/authRoutes');
const channelRoutes = require('./routes/channelRoutes');
const creatorProfileRoutes = require('./routes/creatorProfileRoutes');
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

const { protect, protectOptional } = require('./middleware/authMiddleware');
const { recordProductClick } = require('./controllers/productClickController');
const { getCreatorDashboardSummary } = require('./controllers/creatorDashboardController');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://localhost:5179',
  'http://localhost:5180',
  'http://localhost:5181',
  'http://localhost:5182',
  'http://localhost:5183',
  'http://localhost:5184',
  'http://localhost:5185',
  'http://localhost:5186',
  'http://localhost:5187',
  'http://localhost:5188',
  'http://localhost:5189',
  'http://localhost:5190',
  'http://localhost:5191',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'http://127.0.0.1:5177',
  'http://127.0.0.1:5178',
  'http://127.0.0.1:5179',
  'http://127.0.0.1:5180',
  'http://127.0.0.1:5181',
  'http://127.0.0.1:5182',
  'http://127.0.0.1:5183',
  'http://127.0.0.1:5184',
  'http://127.0.0.1:5185',
  'http://127.0.0.1:5186',
  'http://127.0.0.1:5187',
  'http://127.0.0.1:5188',
  'http://127.0.0.1:5189',
  'http://127.0.0.1:5190',
  'http://127.0.0.1:5191',
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

const uploadCandidates = [
  path.join(__dirname, '../uploads'),
  path.join(__dirname, 'uploads'),
  path.join(process.cwd(), 'uploads'),
];

const uploadsDir = uploadCandidates.find((dir) => fs.existsSync(dir)) || uploadCandidates[0];

console.log('STATIC UPLOADS DIR =>', uploadsDir);

app.use('/uploads', express.static(uploadsDir));

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

app.get('/api/channels-test', (req, res) => {
  res.json({
    message: 'channels app route works',
  });
});

app.get('/api/product-click-test', (req, res) => {
  res.json({
    message: 'APP direct product click test works',
  });
});

app.post('/api/videos/:videoId/product-click', protectOptional, recordProductClick);
app.get('/api/creator/dashboard-summary', protect, getCreatorDashboardSummary);

app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/creator', creatorProfileRoutes);
app.use('/api/videos', videoRoutes);

app.use('/api', channelSubscriptionRoutes);
app.use('/api', videoReactionRoutes);
app.use('/api', commentRoutes);
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