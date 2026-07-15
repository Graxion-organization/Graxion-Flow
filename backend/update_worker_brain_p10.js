const fs = require('fs');
const path = require('path');

const filePath = path.join('C:/Users/yoges/.gemini/antigravity-ide/brain/8be2002a-034c-4a8c-b8f9-3dd1ad9d7516/worker_brain.md');
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `## PHASE 10: 📊 ANALYTICS & MONITORING (P1)

| ID | Status | Started | Completed | Notes |
|---|---|---|---|---|
| ANLY-001 | ✅ COMPLETE | 2026-07-15T15:34 | 2026-07-15T15:35 | Built message volume analytics API |
| ANLY-002 | ✅ COMPLETE | 2026-07-15T15:34 | 2026-07-15T15:35 | Built credit usage analytics API |
| ANLY-003 | ✅ COMPLETE | 2026-07-15T15:34 | 2026-07-15T15:35 | Built AI response time metrics API |
| ANLY-004 | ✅ COMPLETE | 2026-07-15T15:34 | 2026-07-15T15:35 | Built template performance analytics |
| ANLY-005 | ✅ COMPLETE | 2026-07-15T15:34 | 2026-07-15T15:35 | Built broadcast delivery analytics |
| ANLY-006 | ✅ COMPLETE | 2026-07-15T15:34 | 2026-07-15T15:35 | Built per-agent performance analytics |
| ANLY-007 | ✅ COMPLETE | 2026-07-15T15:35 | 2026-07-15T15:36 | Built revenue analytics API for Super Admin |
| ANLY-008 | ✅ COMPLETE | 2026-07-15T15:35 | 2026-07-15T15:36 | Built webhook health dashboard API |
| ANLY-009 | ✅ COMPLETE | 2026-07-15T15:35 | 2026-07-15T15:36 | Built admin API usage monitoring |
| ANLY-010 | ✅ COMPLETE | 2026-07-15T15:36 | 2026-07-15T15:37 | Wired real data into AnalyticsPage.jsx using Recharts |
`;

content = content.replace(/## PHASE 10: 📊 ANALYTICS & MONITORING \([\s\S]*?(?=## PHASE 11: 🇮🇳 INDIA COMPLIANCE|$)/, replacement + '\n\n');

fs.writeFileSync(filePath, content);
console.log('Fixed worker_brain.md for Phase 10');
