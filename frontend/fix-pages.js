const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/IntegrationsPage.jsx',
  'src/pages/AutomationHubPage.jsx',
  'src/pages/FlowBuilderPage.jsx',
  'src/pages/KeywordTriggersPage.jsx',
  'src/pages/FacebookToolPage.jsx',
  'src/pages/InstagramToolPage.jsx',
  'src/pages/YouTubeToolPage.jsx',
  'src/pages/LinkedInToolPage.jsx'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) return;
  let code = fs.readFileSync(fullPath, 'utf8');

  // Skip files that might already be fully processed? 
  // No, just apply replacements.
  let newCode = code;

  // Replace common dark-only classes with responsive ones
  newCode = newCode.replace(/bg-slate-950(?![\w-]| dark:)/g, 'bg-white dark:bg-slate-950');
  newCode = newCode.replace(/text-white(?![\w-\/]| dark:)/g, 'text-slate-800 dark:text-white');
  newCode = newCode.replace(/text-slate-400(?![\w-]| dark:)/g, 'text-slate-500 dark:text-slate-400');
  newCode = newCode.replace(/border-white\/10(?![\w-]| dark:)/g, 'border-slate-200 dark:border-white/10');
  newCode = newCode.replace(/border-white\/5(?![\w-]| dark:)/g, 'border-slate-200 dark:border-white/5');
  newCode = newCode.replace(/bg-white\/5(?![\w-]| dark:)/g, 'bg-slate-50 dark:bg-white/5');
  newCode = newCode.replace(/bg-white\/\[0\.01\](?![\w-]| dark:)/g, 'bg-white dark:bg-white/[0.01]');
  newCode = newCode.replace(/bg-white\/10(?![\w-]| dark:)/g, 'bg-slate-100 dark:bg-white/10');
  newCode = newCode.replace(/hover:bg-white\/10(?![\w-]| dark:)/g, 'hover:bg-slate-100 dark:hover:bg-white/10');
  newCode = newCode.replace(/hover:bg-white\/5(?![\w-]| dark:)/g, 'hover:bg-slate-50 dark:hover:bg-white/5');
  newCode = newCode.replace(/hover:text-white(?![\w-]| dark:)/g, 'hover:text-slate-800 dark:hover:text-white');
  newCode = newCode.replace(/placeholder-slate-600(?![\w-]| dark:)/g, 'placeholder-slate-400 dark:placeholder-slate-600');
  
  // Specific for text-white/XX
  newCode = newCode.replace(/text-white\/60(?![\w-]| dark:)/g, 'text-slate-600 dark:text-white/60');
  newCode = newCode.replace(/text-white\/40(?![\w-]| dark:)/g, 'text-slate-400 dark:text-white/40');
  newCode = newCode.replace(/text-slate-300(?![\w-]| dark:)/g, 'text-slate-700 dark:text-slate-300');

  // Any leftover dark-mode specific string concatenation logic:
  newCode = newCode.replace(/\$\{isDark \? '([^']+)' : '([^']+)'\}/g, (match, dark, light) => {
    const darkClasses = dark.split(/\s+/).filter(Boolean).map(c => 'dark:' + c).join(' ');
    return `${light} ${darkClasses}`;
  });

  if (newCode !== code) {
    fs.writeFileSync(fullPath, newCode);
    console.log('Fixed', file);
  }
});
