console.log('LOADED PRODUCT CLICK ROUTES');

const express = require('express');
const router = express.Router();

const { protectOptional } = require('../middleware/authMiddleware');
const { recordProductClick } = require('../controllers/productClickController');

router.get('/product-click-test', (req, res) => {
  res.json({
    message: 'product click routes work',
  });
});

router.post('/videos/:videoId/product-click', protectOptional, recordProductClick);

module.exports = router;