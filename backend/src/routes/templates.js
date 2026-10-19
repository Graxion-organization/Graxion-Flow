const express = require('express');
const templateController = require('../controllers/templateController');
const { protect } = require('../middleware/auth');
const { injectOrganization, requireOrganization } = require('../middleware/organizationMiddleware');

const router = express.Router();
router.use(protect);
router.use(injectOrganization);
router.use(requireOrganization);

router.get('/system', templateController.getSystemTemplates);
router.post('/clone-system', templateController.cloneSystemTemplate);
router.post('/sync', templateController.syncTemplatesFromMeta);

router
  .route('/')
  .get(templateController.getAllTemplates)
  .post(templateController.createTemplate);

router
  .route('/:id')
  .delete(templateController.deleteTemplate);

module.exports = router;