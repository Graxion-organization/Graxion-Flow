const express = require('express');
const partnerController = require('../controllers/partnerController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Partner routes (Accessible by sales_partner and admin)
router.get('/dashboard', partnerController.getPartnerDashboard);
router.get('/payouts', partnerController.getPartnerPayouts);

// Admin routes (Accessible only by admin / superadmin)
router.get('/admin/partners', restrictTo('admin', 'superadmin'), partnerController.getAllPartners);
router.post('/admin/assign-role', restrictTo('admin', 'superadmin'), partnerController.assignPartnerRole);
router.get('/admin/settings', restrictTo('admin', 'superadmin'), partnerController.getAdminSettings);
router.patch('/admin/settings', restrictTo('admin', 'superadmin'), partnerController.updateAdminSettings);
router.post('/admin/process-payout', restrictTo('admin', 'superadmin'), partnerController.processPayout);

module.exports = router;
