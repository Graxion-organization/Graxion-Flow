const express = require('express');
const { protect } = require('../middleware/auth');
const { injectOrganization, requireOrganization } = require('../middleware/organizationMiddleware');
const telegramController = require('../controllers/telegramController');

const router = express.Router();

router.use(protect);
router.use(injectOrganization);
router.use(requireOrganization);

router.post('/connect', telegramController.connectAccount);
router.get('/accounts', telegramController.getAccounts);
router.delete('/accounts/:id', telegramController.disconnectAccount);

module.exports = router;
