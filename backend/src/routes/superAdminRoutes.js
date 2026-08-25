const express = require('express');
const superAdminController = require('../controllers/superAdminController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Middleware to restrict access to superadmins
const restrictToSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    res.status(403).json({ status: 'fail', message: 'Access denied. Superadmin only.' });
  }
};

router.use(protect);
router.use(restrictToSuperAdmin);

router.get('/stats/global', superAdminController.getGlobalStats);
router.get('/stats/top-users', superAdminController.getTopUsers);

router.route('/rate-limits')
  .get(superAdminController.getRateLimits)
  .post(superAdminController.setRateLimit);

router.delete('/rate-limits/:id', superAdminController.deleteRateLimit);

router.get('/logs/webhooks', superAdminController.getWebhookLogs);
router.get('/logs/api-requests', superAdminController.getApiRequestLogs);

module.exports = router;
