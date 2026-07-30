const fs = require('fs');
const path = require('path');

function replaceConsoleLogs(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceConsoleLogs(fullPath);
    } else if (fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const hasConsoleLog = content.includes('console.log(') || content.includes('console.error(') || content.includes('console.warn(');
      
      if (hasConsoleLog) {
        // Replace console.* with logger.*
        content = content.replace(/console\.log\(/g, 'logger.info(');
        content = content.replace(/console\.error\(/g, 'logger.error(');
        content = content.replace(/console\.warn\(/g, 'logger.warn(');
        
        // Add logger import if missing
        if (!content.includes('require(\'../utils/logger\')') && !content.includes('require("../../utils/logger")') && !content.includes('require(\'./utils/logger\')')) {
          // calculate depth from backend/src
          const relative = path.relative(path.join(__dirname, 'src'), fullPath);
          const depth = relative.split(path.sep).length - 1;
          
          let prefix = '';
          if (depth === 0) prefix = './';
          else if (depth === 1) prefix = '../';
          else if (depth === 2) prefix = '../../';
          else if (depth === 3) prefix = '../../../';

          const importStatement = `const logger = require('${prefix}utils/logger');\n`;
          
          // insert after the first require statement
          const match = content.match(/const [a-zA-Z_]+ = require\(['"][^'"]+['"]\);/);
          if (match) {
            content = content.slice(0, match.index + match[0].length) + '\n' + importStatement + content.slice(match.index + match[0].length);
          } else {
            content = importStatement + content;
          }
        }
        
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

replaceConsoleLogs(path.join(__dirname, 'src'));
