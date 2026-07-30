// routes/conversations.js
const express = require('express');
const convRouter = express.Router();
const convController = require('../controllers/conversationController');
const { protect } = require('../middleware/auth');
const { injectOrganization } = require('../middleware/organizationMiddleware');

convRouter.use(protect);
convRouter.use(injectOrganization);
convRouter.get('/stats', convController.getDashboardStats);
convRouter.get('/leads', convController.getLeadsDashboard);   // ← Lead Intelligence
convRouter.get('/', convController.getConversations);
convRouter.get('/:id', convController.getConversation);
convRouter.get('/:id/messages', convController.getMessages);
convRouter.post('/:id/reply', convController.replyToConversation);
convRouter.get('/:id/templates', convController.getConversationTemplates);
convRouter.post('/:id/templates', convController.createConversationTemplate);
convRouter.post('/:id/send-template', convController.sendTemplateReply);
convRouter.patch('/:id/close', convController.closeConversation);
convRouter.patch('/:id/toggle-status', convController.toggleStatus);
convRouter.post('/:id/tags', convController.addTag);
convRouter.delete('/:id/tags/:tag', convController.removeTag);

module.exports = convRouter;


