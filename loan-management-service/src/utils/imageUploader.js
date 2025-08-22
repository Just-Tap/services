// utils/multerUploader.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const selfieDir = path.join(__dirname, '../uploads/selfies');
if (!fs.existsSync(selfieDir)) {
  fs.mkdirSync(selfieDir, { recursive: true });
}

// Multer storage config (local storage)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, selfieDir);
  },
  filename: (req, file, cb) => {
    // Example: 1692551234567-selfie.png
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

// File filter (only images)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only .jpeg, .jpg, .png files are allowed'));
  }
};

// Multer upload middleware
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // limit: 5MB
  fileFilter
});

module.exports = upload;
