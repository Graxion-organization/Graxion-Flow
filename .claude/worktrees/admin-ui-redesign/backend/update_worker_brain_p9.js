const fs = require('fs');
const path = require('path');

const filePath = path.join('C:/Users/yoges/.gemini/antigravity-ide/brain/8be2002a-034c-4a8c-b8f9-3dd1ad9d7516/worker_brain.md');
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `## PHASE 9: 👥 RBAC & MULTI-TENANCY (P1)

| ID | Status | Started | Completed | Notes |
|---|---|---|---|---|
| RBAC-001 | ✅ COMPLETE | 2026-07-15T15:27 | 2026-07-15T15:28 | Expanded User roles to ['user', 'owner', 'admin', 'editor', 'viewer', 'superadmin'] |
| RBAC-002 | ✅ COMPLETE | 2026-07-15T15:27 | 2026-07-15T15:28 | Expanded Organization member roles |
| RBAC-003 | ✅ COMPLETE | 2026-07-15T15:28 | 2026-07-15T15:29 | Created requireRole permissions middleware |
| RBAC-004 | ✅ COMPLETE | 2026-07-15T15:28 | 2026-07-15T15:29 | Applied permissions middleware to routes |
| RBAC-005 | ✅ COMPLETE | 2026-07-15T15:29 | 2026-07-15T15:30 | Built team member invitation API |
| RBAC-006 | ✅ COMPLETE | 2026-07-15T15:30 | 2026-07-15T15:31 | Built TeamMembers.jsx frontend UI |
| RBAC-007 | ✅ COMPLETE | 2026-07-15T15:29 | 2026-07-15T15:30 | Built activity audit log API |
| RBAC-008 | ✅ COMPLETE | 2026-07-15T15:28 | 2026-07-15T15:29 | Added tenant-level API rate limit |
| RBAC-009 | ✅ COMPLETE | 2026-07-15T15:31 | 2026-07-15T15:32 | Filtered frontend Sidebar and Settings tabs by role |
| RBAC-010 | ✅ COMPLETE | 2026-07-15T15:29 | 2026-07-15T15:30 | Built tenant data export API |
`;

content = content.replace(/## PHASE 9: 👥 RBAC & MULTI-TENANCY \([\s\S]*?(?=## PHASE 10: 📊 ANALYTICS & MONITORING|$)/, replacement + '\n\n');

fs.writeFileSync(filePath, content);
console.log('Fixed worker_brain.md for Phase 9');
