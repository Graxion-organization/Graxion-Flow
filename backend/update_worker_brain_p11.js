const fs = require('fs');
const path = require('path');

const filePath = path.join('C:/Users/yoges/.gemini/antigravity-ide/brain/8be2002a-034c-4a8c-b8f9-3dd1ad9d7516/worker_brain.md');
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `## PHASE 11: 🇮🇳 INDIA COMPLIANCE (P1)

| ID | Status | Started | Completed | Notes |
|---|---|---|---|---|
| IND-001 | ✅ COMPLETE | 2026-07-15T15:39 | 2026-07-15T15:39 | Implemented TRAI DND/opt-in middleware |
| IND-002 | ✅ COMPLETE | 2026-07-15T15:39 | 2026-07-15T15:40 | Built opt-out keyword handling (STOP, CANCEL) in webhook |
| IND-003 | ✅ COMPLETE | 2026-07-15T15:40 | 2026-07-15T15:40 | Added Indian phone number validation |
| IND-004 | ✅ COMPLETE | 2026-07-15T15:41 | 2026-07-15T15:41 | Documented MongoDB Mumbai region requirement in .env.example |
| IND-005 | ✅ COMPLETE | 2026-07-15T15:40 | 2026-07-15T15:40 | Added GSTIN to Organization model |
| IND-006 | ✅ COMPLETE | 2026-07-15T15:40 | 2026-07-15T15:41 | Built GST-compliant invoice generation |
| IND-007 | ✅ COMPLETE | 2026-07-15T15:41 | 2026-07-15T15:41 | Added RBI guidelines notes |
| IND-008 | ✅ COMPLETE | 2026-07-15T15:41 | 2026-07-15T15:43 | Implemented frontend Hindi localization using react-i18next |
`;

content = content.replace(/## PHASE 11: 🇮🇳 INDIA COMPLIANCE \([\s\S]*?(?=## PHASE 12: 🧪 TESTING & CODE QUALITY|$)/, replacement + '\n\n');

fs.writeFileSync(filePath, content);
console.log('Fixed worker_brain.md for Phase 11');
