// services/user-management-service/src/routes/userRoutes.js
// This file defines user-profile related API routes.
const express = require('express');
const {
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  getUserById,
  updateDriverStatus,
  getDriverDocuments
} = require('../controllers/userControllers');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { upload } = require('../utils/imageUploader'); // Multer middleware
const { validateDriverStatusUpdate } = require('../middlewares/validationMiddleware');

const router = express.Router();

// Routes protected by authentication middleware
router.route('/profile')
  .get(protect, getUserProfile) // Get user's own profile
  .put(
    protect,
    upload.fields([ // Use upload.fields for profile update to allow multiple document images
      { name: 'profilePicture', maxCount: 1 },
      { name: 'aadharFrontImage', maxCount: 1 },
      { name: 'aadharBackImage', maxCount: 1 },
      { name: 'panImage', maxCount: 1 },
      { name: 'drivingLicenseFrontImage', maxCount: 1 },
      { name: 'drivingLicenseBackImage', maxCount: 1 },
      { name: 'vehicleRcFrontImage', maxCount: 1 },
      { name: 'vehicleRcBackImage', maxCount: 1 }
    ]),
    updateUserProfile
  );

// Admin-specific routes
router.get('/admin/users', protect, authorize('admin'), getAllUsers); // Get all users
router.get('/admin/users/:id', protect, authorize('admin'), getUserById); // Get user by ID
router.put('/admin/drivers/:id/status', protect, authorize('admin'), validateDriverStatusUpdate, updateDriverStatus); // Update driver status
router.get('/admin/drivers/:id/documents', protect, authorize('admin'), getDriverDocuments); // Get driver documents

module.exports = router;