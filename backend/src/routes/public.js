const express = require('express');
const publicController = require('../controllers/publicController');

const router = express.Router();

router.post('/contact', publicController.submitContactForm);

module.exports = router;
