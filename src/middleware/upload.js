// File: src/middleware/upload.js

const fs = require('fs');
const path = require('path');
const multer = require('multer');

const adsUploadDir = path.join(process.cwd(), 'uploads', 'ads');
const adsThumbUploadDir = path.join(process.cwd(), 'uploads', 'ads', 'thumbnails');

fs.mkdirSync(adsUploadDir, { recursive: true });
fs.mkdirSync(adsThumbUploadDir, { recursive: true });

function cleanName(name = '') {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    if (file.fieldname === 'thumbnail_file') {
      return cb(null, adsThumbUploadDir);
    }

    return cb(null, adsUploadDir);
  },

  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const base = path.basename(file.originalname || 'file', ext);
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    cb(null, `${cleanName(base)}-${timestamp}-${random}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const videoExts = new Set(['.mp4', '.webm', '.mov', '.m4v']);
  const thumbExts = new Set(['.jpg', '.jpeg', '.png', '.webp']);

  const ext = path.extname(file.originalname || '').toLowerCase();

  if (file.fieldname === 'video_file') {
    if (!videoExts.has(ext)) {
      return cb(new Error('Only video files are allowed: mp4, webm, mov, m4v'));
    }
    return cb(null, true);
  }

  if (file.fieldname === 'thumbnail_file') {
    if (!thumbExts.has(ext)) {
      return cb(new Error('Only image files are allowed: jpg, jpeg, png, webp'));
    }
    return cb(null, true);
  }

  return cb(new Error('Unexpected upload field'));
}

const uploadAdMedia = multer({
  storage,
  fileFilter,
  limits: {
    files: 2,
    fileSize: 200 * 1024 * 1024,
  },
}).fields([
  { name: 'video_file', maxCount: 1 },
  { name: 'thumbnail_file', maxCount: 1 },
]);

module.exports = {
  uploadAdMedia,
};