const fs = require('fs');
const path = require('path');

const targetFiles = [
  'backend/src/controllers/agentController.js',
  'backend/src/controllers/conversationController.js',
  'backend/src/controllers/Embeddedsignupcontroller.js',
  'backend/src/controllers/facebookWebhookController.js',
  'backend/src/controllers/instagramWebhookController.js',
  'backend/src/controllers/telegramWebhookController.js',
  'backend/src/controllers/webhookController.js',
  'backend/src/controllers/whatsappController.js',
  'backend/src/middleware/auth.js',
];

targetFiles.forEach(file => {
  const filePath = path.join('c:/whatsapp-saas', file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace req.user.getPlanLimits() -> await req.user.getPlanLimits()
  content = content.replace(/req\.user\.getPlanLimits\(\)/g, 'await req.user.getPlanLimits()');
  // Replace user.getPlanLimits() -> await user.getPlanLimits()
  content = content.replace(/(?<!await\s)user\.getPlanLimits\(\)/g, 'await user.getPlanLimits()');

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
});
