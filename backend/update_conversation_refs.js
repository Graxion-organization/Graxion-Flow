const fs = require('fs');
const path = require('path');

const controllers = [
  'conversationController.js',
  'webhookController.js',
  'facebookWebhookController.js',
  'instagramWebhookController.js',
  'telegramWebhookController.js'
];

controllers.forEach(ctrl => {
  const filePath = path.join(__dirname, 'src', 'controllers', ctrl);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace push with addMessage
  content = content.replace(/conversation\.messages\.push\(\{/g, 'await conversation.addMessage({');
  
  // Replace references in socket emits
  content = content.replace(/messages:\s*conversation\.messages\s*,/g, 'messages: await conversation.getRecentMessages(),');
  
  // Replace context reading
  content = content.replace(/const contextMessages = conversation\.messages/g, 'const contextMessages = await conversation.getRecentMessages(20)');
  
  // Check for duplicate check via some() in instagram and telegram
  content = content.replace(/const isDuplicate = conversation\.messages\?\.some/g, 'const recentMsgs = await conversation.getRecentMessages();\n      const isDuplicate = recentMsgs?.some');

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${ctrl}`);
});
