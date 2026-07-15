const express = require('express');
const router = express.Router();
const dealController = require('../controllers/dealController');
const { protect } = require('../middleware/auth');
const { requireOrganization } = require('../middleware/organizationMiddleware');
const { requireRole } = require('../middleware/permissions');
const { validateBody, schemas } = require('../middleware/validation');

// Use validation schema if available, else omit
router.use(protect);
router.use(requireOrganization);

router.route('/')
  .get(requireRole('viewer'), dealController.getDeals)
  .post(requireRole('editor'), dealController.createDeal);

router.route('/:id')
  .patch(requireRole('editor'), dealController.updateDeal)
  .delete(requireRole('admin'), dealController.deleteDeal);

module.exports = router;
