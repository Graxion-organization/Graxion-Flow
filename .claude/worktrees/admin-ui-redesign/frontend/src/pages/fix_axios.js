const fs = require('fs');
const path = require('path');
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('ToolPage.jsx'));
files.forEach(file => {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/import axios from 'axios';/g, 'import { api } from \'../services/api\';');
  content = content.replace(/const baseURL = process\.env\.REACT_APP_API_URL \|\| 'http:\/\/localhost:5000\/api';\s*/g, '');
  content = content.replace(/axios\.get\(`\$\{baseURL\}([^`]+)`,\s*\{\s*withCredentials:\s*true\s*\}\s*\)/g, 'api.get(`$1`)');
  content = content.replace(/axios\.post\(`\$\{baseURL\}([^`]+)`,\s*(\{.*?\})\s*,\s*\{\s*withCredentials:\s*true\s*\}\s*\)/gs, 'api.post(`$1`, $2)');
  content = content.replace(/axios\.post\(`\$\{baseURL\}([^`]+)`,\s*([^,]+)\s*,\s*\{\s*withCredentials:\s*true\s*\}\s*\)/g, 'api.post(`$1`, $2)');
  content = content.replace(/axios\.get\(`\$\{baseURL\}([^`]+)`\)/g, 'api.get(`$1`)');
  fs.writeFileSync(filePath, content);
});
console.log('Replaced successfully');
