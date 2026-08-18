const express = require('express');
const postAutomationController = require('../controllers/postAutomationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', postAutomationController.saveAutomation);
router.get('/:platform/:accountId/:mediaId', postAutomationController.getAutomation);

module.exports = router;
