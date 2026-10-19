const express = require('express');
const optOutController = require('../controllers/optOutController');
const { protect } = require('../middleware/auth');
const { injectOrganization, requireOrganization } = require('../middleware/organizationMiddleware');

const router = express.Router();
router.use(protect);
router.use(injectOrganization);
router.use(requireOrganization);

router
  .route('/')
  .get(optOutController.getAllOptOuts)
  .post(optOutController.addOptOut);

router
  .route('/:phone')
  .delete(optOutController.removeOptOut);

module.exports = router;