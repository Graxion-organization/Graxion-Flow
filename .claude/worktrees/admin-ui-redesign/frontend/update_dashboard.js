const fs = require('fs');
const path = require('path');

const filePath = path.join('c:/whatsapp-saas/frontend/src/pages/DashboardPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Remove the state and handleSimulateOptimize
content = content.replace(/const \[optimizeText[\s\S]*?}, 1500\);\n  };/, '');

// Remove the JSX block for the AI Optimizer
content = content.replace(/\{\/\* 🚀 Feature Flag Controlled AI Optimizer Widget \*\/\}[\s\S]*?<\/AnimatePresence>\n          <\/div>\n        <\/div>\n      \)\}/, '');

fs.writeFileSync(filePath, content);
console.log('Updated DashboardPage.jsx');
