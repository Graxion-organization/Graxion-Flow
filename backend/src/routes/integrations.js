const express = require('express');
const router = express.Router();
const integrationsController = require('../controllers/integrationsController');
const { protect } = require('../middleware/auth');
const { injectOrganization, requireOrganization } = require('../middleware/organizationMiddleware');

router.use(protect);
router.use(injectOrganization);
router.use(requireOrganization);

router.get('/', integrationsController.getIntegrations);
router.post('/connect/:platform', integrationsController.connectIntegration);
router.delete('/disconnect/:platform', integrationsController.disconnectIntegration);

module.exports = router;
