const express = require('express');
const campaignController = require('../controllers/campaignController');
const { protect } = require('../middleware/auth');
const { injectOrganization, requireOrganization } = require('../middleware/organizationMiddleware');

const router = express.Router();
router.use(protect);
router.use(injectOrganization);
router.use(requireOrganization);

router
  .route('/')
  .get(campaignController.getAllCampaigns)
  .post(campaignController.createCampaign);

router
  .route('/:id')
  .get(campaignController.getCampaign)
  .patch(campaignController.updateCampaign);

module.exports = router;