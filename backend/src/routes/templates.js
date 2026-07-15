const express = require('express');
const templateController = require('../controllers/templateController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.post('/sync', templateController.syncTemplatesFromMeta);

router
  .route('/')
  .get(templateController.getAllTemplates)
  .post(templateController.createTemplate);

router
  .route('/:id')
  .delete(templateController.deleteTemplate);

module.exports = router;