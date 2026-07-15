const express = require('express');
const contactController = require('../controllers/contactController');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const router = express.Router();
router.use(protect);

router.post('/import', upload.single('file'), contactController.importContacts);
router.get('/export', contactController.exportContacts);

router
  .route('/')
  .get(contactController.getAllContacts)
  .post(contactController.createContact);

router
  .route('/:id')
  .get(contactController.getContact)
  .patch(contactController.updateContact)
  .delete(contactController.deleteContact);

module.exports = router;