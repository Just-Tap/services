// src/middlewares/validationMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');

// Create upload directories if they don't exist
const subDirs = ['selfies', 'address_proofs', 'bank_statements'];
subDirs.forEach(dir => {
  const dirPath = path.join(uploadDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
});

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = 'uploads'; // Default folder
    if (file.fieldname === 'selfieImage') {
      folder = 'selfies';
    } else if (file.fieldname === 'governmentAddressProofImage') {
      folder = 'address_proofs';
    } else if (file.fieldname === 'bankStatements') {
      folder = 'bank_statements';
    }
    const dest = path.join(uploadDir, folder);
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter to allow only specific file types
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|pdf/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Error: File upload only supports the following filetypes - jpeg, jpg, png, pdf'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit
  fileFilter: fileFilter,
});

module.exports = upload;
