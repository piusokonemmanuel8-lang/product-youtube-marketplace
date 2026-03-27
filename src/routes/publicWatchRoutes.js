const express = require('express');
const router = express.Router();

const publicWatchController = require('../controllers/publicWatchController');

console.log('publicWatchController keys:', Object.keys(publicWatchController || {}));
console.log('getPublicWatchPage type:', typeof publicWatchController.getPublicWatchPage);
console.log('recordPublicVideoView type:', typeof publicWatchController.recordPublicVideoView);
console.log('getRelatedVideos type:', typeof publicWatchController.getRelatedVideos);

router.get('/watch/:slug', publicWatchController.getPublicWatchPage);
router.post('/videos/:videoId/views', publicWatchController.recordPublicVideoView);
router.get('/videos/:videoId/related', publicWatchController.getRelatedVideos);

module.exports = router;