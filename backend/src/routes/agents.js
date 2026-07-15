// routes/agents.js
const express = require('express');
const agentRouter = express.Router();
const agentController = require('../controllers/agentController');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { injectOrganization, requireOrganization } = require('../middleware/organizationMiddleware');

const multer = require('multer');
const fs = require('fs');

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

agentRouter.use(protect);
agentRouter.use(injectOrganization);
agentRouter.use(requireOrganization);
agentRouter.get('/models', agentController.getAvailableModels);
agentRouter.route('/')
  .get(agentController.getAgents)
  .post(validate(schemas.createAgent), agentController.createAgent);
agentRouter.route('/:id')
  .get(agentController.getAgent)
  .patch(agentController.updateAgent)
  .delete(agentController.deleteAgent);
agentRouter.post('/:id/toggle', agentController.toggleAgent);
agentRouter.post('/:id/test', agentController.testAgent);
agentRouter.post('/:id/knowledge-base', upload.single('file'), agentController.uploadKnowledgeBase);
agentRouter.delete('/:id/knowledge-base/:entryIndex', agentController.deleteKnowledgeBaseEntry);

module.exports = agentRouter;
