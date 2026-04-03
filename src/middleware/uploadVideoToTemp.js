const fs = require('fs');
const path = require('path');
const multer = require('multer');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

const tempUploadsRoot = path.join(process.cwd(), 'uploads', 'temp-videos');
ensureDir(tempUploadsRoot);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, tempUploadsRoot);
  },
  filename(req, file, cb) {
    const safeOriginalName = String(file.originalname || 'video')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9.\-_]/g, '');

    const ext = path.extname(safeOriginalName) || '.mp4';
    const baseName = path.basename(safeOriginalName, ext) || 'video';

    cb(null, `${Date.now()}-${baseName}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const mime = String(file.mimetype || '').toLowerCase();

  if (!mime.startsWith('video/')) {
    return cb(new Error('Only video files are allowed'));
  }

  cb(null, true);
}

const uploadVideoToTemp = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 500, // 500MB
  },
});

module.exports = uploadVideoToTemp;