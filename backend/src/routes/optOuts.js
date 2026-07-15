const express = require('express');
const optOutController = require('../controllers/optOutController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router
  .route('/')
  .get(optOutController.getAllOptOuts)
  .post(optOutController.addOptOut);

router
  .route('/:phone')
  .delete(optOutController.removeOptOut);

module.exports = router;