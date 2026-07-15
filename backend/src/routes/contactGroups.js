const express = require('express');
const contactGroupController = require('../controllers/contactGroupController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router
  .route('/')
  .get(contactGroupController.getAllGroups)
  .post(contactGroupController.createGroup);

router
  .route('/:id')
  .patch(contactGroupController.updateGroup)
  .delete(contactGroupController.deleteGroup);

module.exports = router;