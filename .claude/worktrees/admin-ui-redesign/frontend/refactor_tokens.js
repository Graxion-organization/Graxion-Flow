const fs = require('fs');
const path = require('path');

const targetFiles = [
  'frontend/src/pages/AIPresenterPage.jsx',
  'frontend/src/pages/ConversationsPage.jsx',
  'frontend/src/pages/FacebookToolPage.jsx',
  'frontend/src/pages/InstagramToolPage.jsx',
  'frontend/src/pages/LinkedInToolPage.jsx',
  'frontend/src/pages/YouTubeToolPage.jsx',
  'frontend/src/pages/admin/ApiExplorer.jsx',
  'frontend/src/pages/admin/InstagramTool.jsx'
];

targetFiles.forEach(file => {
  const filePath = path.join('c:/whatsapp-saas', file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace socket io token with withCredentials
  // auth: { token } -> withCredentials: true
  // const token = localStorage.getItem('token'); -> remove or comment out
  content = content.replace(/const token = localStorage\.getItem\('token'\);/g, '// JWT via cookies');
  content = content.replace(/auth:\s*{\s*token\s*}/g, 'withCredentials: true');
  content = content.replace(/auth:\s*{\s*token:.*?\s*}/g, 'withCredentials: true');
  
  // Replace axios headers
  // headers: { Authorization: `Bearer ${token}` } -> withCredentials: true
  content = content.replace(/headers:\s*{\s*Authorization:\s*`Bearer \${token}`\s*}/g, 'withCredentials: true');
  content = content.replace(/headers:\s*{\s*Authorization:\s*'Bearer '\s*\+\s*token\s*}/g, 'withCredentials: true');

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
});
