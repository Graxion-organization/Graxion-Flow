const express = require('express');
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Public branding settings endpoint (unauthenticated)
router.get('/public-settings', adminController.getPublicSettings);

// All routes below here are restricted to admin
router.use(protect);
router.use(restrictTo('admin'));

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails);
router.patch('/users/:id', adminController.updateUser);
router.post('/users/:id/request-role-change', adminController.requestRoleChange);
router.post('/users/:id/confirm-role-change', adminController.confirmRoleChange);

router.get('/health', adminController.getSystemHealth);
router.get('/settings', adminController.getSystemSettings);
router.patch('/settings', adminController.updateSystemSetting);
router.get('/system-routes', adminController.getSystemRoutes);

router.get('/logs', adminController.getSystemLogs);
router.get('/orphan-media', adminController.getOrphanMedia);
router.delete('/orphan-media', adminController.deleteMedia);

// Instagram Tools
router.get('/instagram/accounts', adminController.getInstagramAccounts);
router.get('/instagram/:accountId/media', adminController.getInstagramMedia);
router.get('/instagram/:accountId/stats', adminController.getInstagramStats);
router.get('/instagram/:accountId/media/:mediaId/comments', adminController.getInstagramComments);
router.post('/instagram/comment', adminController.sendInstagramComment);
router.post('/instagram/trigger-worker', adminController.triggerInstagramWorker);
router.post('/instagram/auto-reply-post', adminController.aiAutoReplyPost);

// Deletion Requests
router.get('/deletion-requests', adminController.getDeletionRequests);
router.post('/users/:id/cancel-deletion', adminController.cancelDeletionRequest);

// Admin Signup Requests management
router.get('/signup-requests', adminController.getSignupRequests);
router.post('/signup-requests/:id/send-otp', adminController.sendSignupRequestOTP);
router.post('/signup-requests/:id/approve', adminController.approveSignupRequest);
router.post('/signup-requests/:id/reject', adminController.rejectSignupRequest);

// Administrative Activity Logs (Audit logs)
router.get('/activities', adminController.getAdminActivities);

// Plan Management
router.get('/plans', adminController.getAllPlans);
router.post('/plans', adminController.createPlan);
router.patch('/plans/:id', adminController.updatePlan);
router.delete('/plans/:id', adminController.deletePlan);

// Payments Management
router.get('/payments', adminController.getAllPayments);
router.patch('/payments/:id/status', adminController.updatePaymentStatus);

// Contact Messages Management
router.get('/contact-messages', adminController.getContactMessages);
router.patch('/contact-messages/:id/read', adminController.markContactMessageRead);

// Admin Analytics (Phase 10)
router.get('/analytics/revenue', adminController.getRevenueMetrics);
router.get('/analytics/webhook-health', adminController.getWebhookHealth);
router.get('/analytics/api-usage', adminController.getApiUsage);
router.post('/payments/:id/refund', adminController.refundPayment);

module.exports = router;
