const fs = require('fs');
const path = require('path');

const filePath = path.join('C:/Users/yoges/.gemini/antigravity-ide/brain/8be2002a-034c-4a8c-b8f9-3dd1ad9d7516/worker_brain.md');
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `## PHASE 3: 🏗️ DATABASE ARCHITECTURE (P0)

| ID | Status | Started | Completed | Notes |
|---|---|---|---|---|
| DB-001 | ✅ COMPLETE | 2026-07-15T14:28 | 2026-07-15T14:28 | Created separate Message.js schema |
| DB-002 | ✅ COMPLETE | 2026-07-15T14:28 | 2026-07-15T14:30 | Migrated 228 embedded messages |
| DB-003 | ✅ COMPLETE | 2026-07-15T14:30 | 2026-07-15T14:30 | Removed messages array from Conversation |
| DB-004 | ✅ COMPLETE | 2026-07-15T14:30 | 2026-07-15T14:31 | Updated all webhooks to use addMessage method |
| DB-005 | ✅ COMPLETE | 2026-07-15T14:31 | 2026-07-15T14:34 | Added paginated getMessages API |
| DB-006 | ✅ COMPLETE | 2026-07-15T14:34 | 2026-07-15T14:36 | Generated Contact model |
| DB-007 | ✅ COMPLETE | 2026-07-15T14:34 | 2026-07-15T14:36 | Generated ContactGroup model |
| DB-008 | ✅ COMPLETE | 2026-07-15T14:34 | 2026-07-15T14:36 | Generated Template model |
| DB-009 | ✅ COMPLETE | 2026-07-15T14:34 | 2026-07-15T14:36 | Generated Broadcast model |
| DB-010 | ✅ COMPLETE | 2026-07-15T14:34 | 2026-07-15T14:36 | Generated Campaign model |
| DB-011 | ✅ COMPLETE | 2026-07-15T14:34 | 2026-07-15T14:36 | Generated WebhookLog model |
| DB-012 | ✅ COMPLETE | 2026-07-15T14:34 | 2026-07-15T14:36 | Generated Flow model |
| DB-013 | ✅ COMPLETE | 2026-07-15T14:34 | 2026-07-15T14:36 | Generated KeywordTrigger model |
| DB-014 | ✅ COMPLETE | 2026-07-15T14:34 | 2026-07-15T14:36 | Generated OptOut model |
| DB-015 | ✅ COMPLETE | 2026-07-15T14:34 | 2026-07-15T14:36 | Generated Invoice model |
| DB-016 | ✅ COMPLETE | 2026-07-15T14:34 | 2026-07-15T14:36 | Generated Notification model |
| DB-017 | ✅ COMPLETE | 2026-07-15T14:37 | 2026-07-15T14:37 | Implemented cascade deletes in User.js pre hooks |
| DB-018 | ✅ COMPLETE | 2026-07-15T14:34 | 2026-07-15T14:36 | Embedded proper compound indexes in models |
| DB-019 | ✅ COMPLETE | 2026-07-15T14:37 | 2026-07-15T14:38 | Installed migrate-mongo and migrated extract script |
| DB-020 | ✅ COMPLETE | 2026-07-15T14:36 | 2026-07-15T14:37 | Enforced max members array length via User limits |`;

// Use regex to replace everything from ## PHASE 3: to ---
content = content.replace(/\| DB-018 \| ⬜ PENDING \| — \| — \| Do after all DB-006 through DB-016 \|\n\| DB-019 \| ⬜ PENDING \| — \| — \|\n\| DB-020 \| ⬜ PENDING \| — \| — \|/, replacement);

fs.writeFileSync(filePath, content);
console.log('Fixed worker_brain.md table');
