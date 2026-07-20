const express = require('express');
const broadcastController = require('../controllers/broadcastController');
const { protect } = require('../middleware/auth');
const { injectOrganization, requireOrganization } = require('../middleware/organizationMiddleware');
 
const router = express.Router();
router.use(protect);
router.use(injectOrganization);
router.use(requireOrganization);
 
router
  .route('/')
  .get(broadcastController.getAllBroadcasts)
  .post(broadcastController.createBroadcast);

router
  .route('/:id')
  .get(broadcastController.getBroadcast);

module.exports = router;