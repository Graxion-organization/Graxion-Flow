const express = require('express');
const organizationController = require('../controllers/organizationController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');

const router = express.Router();

router.use(authMiddleware.protect);

router.route('/')
  .get(organizationController.getOrganizations)
  .post(organizationController.createOrganization);

router.post('/switch/:organizationId', organizationController.switchOrganization);

// Protected routes (requires specific roles)
router.get('/:organizationId', requireRole('viewer'), organizationController.getOrganizationDetails);
router.post('/invite', requireRole('admin'), organizationController.inviteMember);
router.get('/:organizationId/activity', requireRole('admin'), organizationController.getActivityLogs);
router.get('/:organizationId/export', requireRole('owner'), organizationController.exportData);

module.exports = router;