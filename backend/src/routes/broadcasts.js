const express = require('express');
const broadcastController = require('../controllers/broadcastController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router
  .route('/')
  .get(broadcastController.getAllBroadcasts)
  .post(broadcastController.createBroadcast);

router
  .route('/:id')
  .get(broadcastController.getBroadcast);

module.exports = router;