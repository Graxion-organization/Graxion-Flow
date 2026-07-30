const express = require('express');
const { protect } = require('../middleware/auth');
const { injectOrganization, requireOrganization } = require('../middleware/organizationMiddleware');
const marketingCopilotController = require('../controllers/marketingCopilotController');

const router = express.Router();

// All routes require authentication and organization inject/check
router.use(protect);
router.use(injectOrganization);
router.use(requireOrganization);

// Campaign details
router.get('/campaign', marketingCopilotController.getCampaign);
router.post('/details', marketingCopilotController.saveDetails);

// Strategy & Content Generation
router.post('/strategy', marketingCopilotController.generateStrategy);
router.post('/calendar', marketingCopilotController.generateCalendar);

// Assets and Scheduling
router.post('/generate-assets', marketingCopilotController.generatePostAssets);
router.post('/approve-manual', marketingCopilotController.approveManualPost);
router.post('/schedule', marketingCopilotController.schedulePost);
router.post('/schedule-all', marketingCopilotController.scheduleAll);

// Reset Campaign
router.delete('/campaign', marketingCopilotController.deleteCampaign);

module.exports = router;
