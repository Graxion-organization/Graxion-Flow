const express = require('express');
const contactGroupController = require('../controllers/contactGroupController');
const { protect } = require('../middleware/auth');
const { injectOrganization, requireOrganization } = require('../middleware/organizationMiddleware');

const router = express.Router();
router.use(protect);
router.use(injectOrganization);
router.use(requireOrganization);

router
  .route('/')
  .get(contactGroupController.getAllGroups)
  .post(contactGroupController.createGroup);

router
  .route('/:id')
  .patch(contactGroupController.updateGroup)
  .delete(contactGroupController.deleteGroup);

module.exports = router;