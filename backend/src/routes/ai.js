const express = require('express');
const { protect } = require('../middleware/auth');
const socialHubController = require('../controllers/socialHubController');

const router = express.Router();

router.use(protect);
router.post('/generate-image', socialHubController.generateImage);

module.exports = router;
