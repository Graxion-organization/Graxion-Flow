const express = require('express');
const featureFlagController = require('../controllers/featureFlagController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All routes here require authentication
router.use(protect);

// 1. User Endpoint: Evaluate flags for current logged-in user
router.get('/evaluate', featureFlagController.evaluateAllFlags);

// 2. Admin Endpoints: Full Management Suite (Restricted to admins)
router.use(restrictTo('admin'));

// Get all beta testers
router.get('/beta-testers', featureFlagController.getBetaTesters);

router.route('/')
  .get(featureFlagController.getAllFlags)
  .post(featureFlagController.createFlag);

router.route('/:id')
  .get(featureFlagController.getFlagDetails)
  .patch(featureFlagController.updateFlag)
  .delete(featureFlagController.deleteFlag);

router.post('/:id/toggle', featureFlagController.toggleFlag);

// Promote/demote a user as a beta tester
router.patch('/users/:userId/beta', featureFlagController.updateUserBetaStatus);

module.exports = router;
