const express = require('express');
const postAutomationController = require('../controllers/postAutomationController');
const { protect } = require('../middleware/auth');
const { injectOrganization, requireOrganization } = require('../middleware/organizationMiddleware');

const router = express.Router();

router.use(protect);
router.use(injectOrganization);
router.use(requireOrganization);

router.post('/', postAutomationController.saveAutomation);
router.get('/:platform/:accountId/:mediaId', postAutomationController.getAutomation);

module.exports = router;
