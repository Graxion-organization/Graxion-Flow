const express = require('express');
const router = express.Router();
const integrationsController = require('../controllers/integrationsController');
const { protect } = require('../middleware/auth');
const { checkOrganization } = require('../middleware/organization');

router.use(protect);
router.use(checkOrganization);

router.get('/', integrationsController.getIntegrations);
router.post('/connect/:platform', integrationsController.connectIntegration);
router.delete('/disconnect/:platform', integrationsController.disconnectIntegration);

module.exports = router;
