// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { checkFraudRisk, strictAuthLimiter } = require('../middleware/fraudDetectionMiddleware');

router.post('/register', strictAuthLimiter, checkFraudRisk, validate(schemas.register), authController.register);
router.post('/login', strictAuthLimiter, checkFraudRisk, validate(schemas.login), authController.login);
router.post('/admin/register', authController.adminRegister);
router.post('/admin/login', authController.adminLogin);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/csrf', authController.getCsrfToken);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', validate(schemas.forgotPassword), authController.forgotPassword);
router.patch('/reset-password/:token', validate(schemas.resetPassword), authController.resetPassword);

router.use(protect);
router.get('/me', authController.getMe);
router.patch('/update-profile', authController.updateProfile);
router.patch('/change-password', authController.changePassword);
router.get('/onboarding-status', authController.getOnboardingStatus);
router.post('/request-deletion', authController.requestDeletion);
router.post('/send-deletion-otp', authController.sendDeletionOTPs);
router.post('/confirm-deletion', authController.confirmDeletionRequest);
router.post('/cancel-deletion-request', authController.cancelDeletionRequest);

module.exports = router;
