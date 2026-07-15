const express = require('express');
const flowController = require('../controllers/flowController');
const { protect } = require('../middleware/auth');
const { injectOrganization } = require('../middleware/organizationMiddleware');

const router = express.Router();

router.use(protect);
router.use(injectOrganization);

router.route('/')
  .get(flowController.getFlows)
  .post(flowController.createFlow);

router.route('/:id')
  .get(flowController.getFlow)
  .patch(flowController.updateFlow)
  .delete(flowController.deleteFlow);

module.exports = router;
