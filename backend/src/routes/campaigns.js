const express = require('express');
const campaignController = require('../controllers/campaignController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router
  .route('/')
  .get(campaignController.getAllCampaigns)
  .post(campaignController.createCampaign);

router
  .route('/:id')
  .get(campaignController.getCampaign)
  .patch(campaignController.updateCampaign);

module.exports = router;