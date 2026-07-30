const fs = require('fs');
const path = require('path');

const filePath = path.join('c:/whatsapp-saas/backend/src/controllers/webhookController.js');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  `        logger.error(\`Error processing WhatsApp webhook task: \${err.message}\`, { stack: err.stack });
      }
    }, { platform: 'whatsapp', payload: { from, phoneNumberId, messageId, text } });`,
  `        logger.error(\`Error processing WhatsApp webhook task: \${err.message}\`, { stack: err.stack });
      }`
);

fs.writeFileSync(filePath, content);
console.log('Fixed trailing webhook syntax');
