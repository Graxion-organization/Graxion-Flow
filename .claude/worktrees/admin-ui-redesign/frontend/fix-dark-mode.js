const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  let originalCode = code;

  // Replace standard isDark pattern
  code = code.replace(/isDark\s*\?\s*'([^']+)'\s*:\s*'([^']+)'/g, (match, darkClasses, lightClasses) => {
    const darks = darkClasses.split(/\s+/).filter(Boolean).map(c => 'dark:' + c).join(' ');
    return `'${lightClasses} ${darks}'`;
  });

  // Remove isDark definition and props if it's no longer used or just remove it
  // Wait, if it's passed as a prop, maybe we just strip it
  code = code.replace(/const \[isDark, setIsDark\] = useState\([^)]+\);\n?/g, '');
  code = code.replace(/isDark=\{isDark\}/g, '');
  
  // Strip isDark from component declarations
  code = code.replace(/\{ isDark \}/g, '{}');

  if (code !== originalCode) {
    fs.writeFileSync(filePath, code);
    console.log(`Processed ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      processFile(fullPath);
    }
  }
}

walkDir('src/components/social');
walkDir('src/pages');
console.log('Done');
