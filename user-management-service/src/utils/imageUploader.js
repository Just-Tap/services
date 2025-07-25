// This file handles image uploads to cloud storage (e.g., AWS S3, Google Cloud Storage).
// For MVP, this is a placeholder. In a real app, you'd integrate with a cloud SDK.
const multer = require('multer'); // For handling multipart/form-data (file uploads)
const path = require('path');
const crypto = require('crypto'); // For generating unique filenames

// --- Placeholder for Cloud Storage Logic ---
// In a real application, you would integrate with AWS S3 SDK, Google Cloud Storage SDK, etc.
// This function would upload the buffer/stream to the cloud and return the public URL.
const uploadToCloudStorage = async (fileBuffer, originalname, mimetype) => {
  // This is a SIMULATED upload.
  // In a real scenario, you'd use AWS S3 SDK, Google Cloud Storage SDK, etc.
  /*
  const AWS = require('aws-sdk');
  const s3 = new AWS.S3({
    accessKeyId: process.env.CLOUD_STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUD_STORAGE_SECRET_ACCESS_KEY,
    region: 'your-region'
  });
  const uniqueFilename = `${crypto.randomBytes(16).toString('hex')}-${Date.now()}${path.extname(originalname)}`;
  const params = {
    Bucket: process.env.CLOUD_STORAGE_BUCKET_NAME,
    Key: uniqueFilename,
    Body: fileBuffer,
    ContentType: mimetype,
    ACL: 'public-read' // Make the file publicly accessible
  };
  const data = await s3.upload(params).promise();
  return data.Location; // Returns the public URL
  */

  // For MVP, just simulate a URL
  const uniqueFilename = `${crypto.randomBytes(16).toString('hex')}-${Date.now()}${path.extname(originalname)}`;
  const simulatedUrl = `https://your-cloud-storage-domain.com/uploads/${uniqueFilename}`;
  console.log(`Simulating upload for ${originalname}. Stored at: ${simulatedUrl}`);
  return simulatedUrl;
};

// Multer storage configuration for memory storage (files are kept in memory as buffers)
// This is suitable for small files and then passing to cloud storage.
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg']; // Added jpg
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, JPG, PNG, GIF are allowed.'), false);
    }
  }
});

module.exports = { upload, uploadToCloudStorage };