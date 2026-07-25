const express = require('express');
const keywordController = require('../controllers/keywordController');
const { protect } = require('../middleware/auth');
const { injectOrganization, requireOrganization } = require('../middleware/organizationMiddleware');

const router = express.Router();
router.use(protect);
router.use(injectOrganization);
router.use(requireOrganization);

router
  .route('/')
  .get(keywordController.getAllKeywords)
  .post(keywordController.createKeyword);

router
  .route('/:id')
  .patch(keywordController.updateKeyword)
  .delete(keywordController.deleteKeyword);

module.exports = router;