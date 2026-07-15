const fs = require('fs');
const path = require('path');

const filePath = path.join('C:/Users/yoges/.gemini/antigravity-ide/brain/8be2002a-034c-4a8c-b8f9-3dd1ad9d7516/worker_brain.md');
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `## PHASE 8: 🖥️ FRONTEND — MISSING PAGES (P0-P1)

| ID | Status | Started | Completed | Notes |
|---|---|---|---|---|
| FE-001 | ✅ COMPLETE | 2026-07-15T15:17 | 2026-07-15T15:18 | Contacts list page built |
| FE-002 | ✅ COMPLETE | 2026-07-15T15:17 | 2026-07-15T15:18 | Import CSV modal built |
| FE-003 | ✅ COMPLETE | 2026-07-15T15:17 | 2026-07-15T15:18 | Segment/Group manager built |
| FE-004 | ✅ COMPLETE | 2026-07-15T15:18 | 2026-07-15T15:20 | Meta Templates page built |
| FE-005 | ✅ COMPLETE | 2026-07-15T15:18 | 2026-07-15T15:20 | Broadcast sending interface built |
| FE-006 | ✅ COMPLETE | 2026-07-15T15:18 | 2026-07-15T15:20 | Campaigns tracking page built |
| FE-007 | ✅ COMPLETE | 2026-07-15T15:20 | 2026-07-15T15:23 | Installed reactflow & built FlowBuilderPage |
| FE-008 | ✅ COMPLETE | 2026-07-15T15:23 | 2026-07-15T15:24 | Recharts Analytics Dashboard built |
| FE-009 | ✅ COMPLETE | 2026-07-15T15:20 | 2026-07-15T15:23 | Keyword triggers UI built |
| FE-010 | ✅ COMPLETE | 2026-07-15T15:24 | 2026-07-15T15:25 | Replaced all ComingSoon stubs |
| FE-011 | ✅ COMPLETE | 2026-07-15T15:23 | 2026-07-15T15:24 | IntegrationsPage built |
| FE-012 | ✅ COMPLETE | 2026-07-15T15:17 | 2026-07-15T15:17 | Added all backend APIs to frontend |
| FE-013 | ✅ COMPLETE | 2026-07-15T15:17 | 2026-07-15T15:17 | Created Zustand CRM and Flow stores |
| FE-014 | ✅ COMPLETE | 2026-07-15T15:17 | 2026-07-15T15:25 | Pages are responsive using Tailwind |
| FE-015 | ✅ COMPLETE | 2026-07-15T15:17 | 2026-07-15T15:17 | Added 5min TTL to feature flags in Zustand |
`;

content = content.replace(/## PHASE 8: 🖥️ FRONTEND — MISSING PAGES \([\s\S]*?(?=## PHASE 9: 👥 RBAC & MULTI-TENANCY|$)/, replacement + '\n\n');

fs.writeFileSync(filePath, content);
console.log('Fixed worker_brain.md for Phase 8');
