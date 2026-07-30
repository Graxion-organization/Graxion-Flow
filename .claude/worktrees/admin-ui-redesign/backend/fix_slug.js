const fs = require('fs');
const path = require('path');

const filePath = path.join('c:/whatsapp-saas/backend/src/models/Organization.js');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  `    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');`,
  `    const randomSuffix = Math.random().toString(36).substring(2, 7);\n    this.slug = \`\${this.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-\${randomSuffix}\`;`
);

fs.writeFileSync(filePath, content);
console.log('Restored randomSuffix in Organization.js');
