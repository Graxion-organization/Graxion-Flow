const fs = require('fs');

const path = 'C:\\Users\\yoges\\.gemini\\antigravity-ide\\brain\\8be2002a-034c-4a8c-b8f9-3dd1ad9d7516\\worker_brain.md';
let content = fs.readFileSync(path, 'utf8');

// Update Phase 15 status
content = content.replace(/\| 15 \| 🚀 Meta API \| 10 \| 0 \| 10 \| ⬜ NOT STARTED \|/g, '| 15 | 🚀 Meta API | 10 | 10 | 0 | ✅ COMPLETED |');

// Update overall status summary at the end
if (content.includes('- Phase 15 (Meta API): Pending')) {
    content = content.replace(/- Phase 15 \(Meta API\): Pending/g, '- Phase 15 (Meta API): Completed');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Worker brain updated for Phase 15');
