const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadsRoot = process.env.CHAT_UPLOAD_DIR
  ? path.resolve(process.env.CHAT_UPLOAD_DIR)
  : path.resolve(__dirname, '..', '..', 'uploads', 'chat');
const maxFileSize = Number(process.env.CHAT_UPLOAD_MAX_SIZE || 10 * 1024 * 1024);

if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsRoot),
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname || '').replace(/[^a-zA-Z0-9.]/g, '');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const allowedMimes = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/zip',
]);

const uploadChatAttachment = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimes.has(file.mimetype)) {
      cb(new Error('Unsupported file type for chat attachment.'));
      return;
    }
    cb(null, true);
  },
});

module.exports = { uploadChatAttachment, uploadsRoot };
