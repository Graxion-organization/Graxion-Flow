const fs = require('fs');
const files = [
  './src/controllers/instagramWebhookController.js',
  './src/controllers/facebookWebhookController.js',
  './src/services/aiService.js'
];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/console\.log\(`\[RENDER_LOG\]/g, 'logger.info(`[RENDER_LOG]');
  content = content.replace(/console\.error\(`\[RENDER_LOG\]/g, 'logger.error(`[RENDER_LOG]');
  fs.writeFileSync(file, content);
}
console.log('Done');
