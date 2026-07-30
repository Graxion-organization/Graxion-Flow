const fs = require('fs');
const path = require('path');

const filePath = path.join('C:/Users/yoges/.gemini/antigravity-ide/brain/8be2002a-034c-4a8c-b8f9-3dd1ad9d7516/worker_brain.md');
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `## PHASE 7: 🤖 AI & AUTOMATION ENGINE (P1)

| ID | Status | Started | Completed | Notes |
|---|---|---|---|---|
| AI-001 | ✅ COMPLETE | 2026-07-15T15:10 | 2026-07-15T15:11 | Flow Builder CRUD API |
| AI-002 | ✅ COMPLETE | 2026-07-15T15:10 | 2026-07-15T15:11 | Visual Flow Engine Execution Core |
| AI-003 | ✅ COMPLETE | 2026-07-15T15:10 | 2026-07-15T15:11 | Flow Engine interception in webhooks |
| AI-004 | ✅ COMPLETE | 2026-07-15T15:10 | 2026-07-15T15:11 | Added 'start' and 'message' node logic |
| AI-005 | ✅ COMPLETE | 2026-07-15T15:10 | 2026-07-15T15:11 | Added 'delay' node logic |
| AI-006 | ✅ COMPLETE | 2026-07-15T15:10 | 2026-07-15T15:11 | Added 'condition' node logic |
| AI-007 | ✅ COMPLETE | 2026-07-15T15:11 | 2026-07-15T15:11 | Created auto-assignment logic |
| AI-008 | ✅ COMPLETE | 2026-07-15T15:11 | 2026-07-15T15:11 | Added SSE AI Streaming Endpoint |
| AI-009 | ✅ COMPLETE | 2026-07-15T15:11 | 2026-07-15T15:11 | Added context summarization limits |
| AI-010 | ✅ COMPLETE | 2026-07-15T15:11 | 2026-07-15T15:11 | Implemented LLM token usage tracking |
| AI-011 | ✅ COMPLETE | 2026-07-15T15:11 | 2026-07-15T15:11 | Added Redis AI response caching |
| AI-012 | ✅ COMPLETE | 2026-07-15T15:11 | 2026-07-15T15:11 | Added reusable Prompt Templates API |
| AI-013 | ✅ COMPLETE | 2026-07-15T15:11 | 2026-07-15T15:11 | Built heuristic lead scoring engine |
| AI-014 | ✅ COMPLETE | 2026-07-15T15:11 | 2026-07-15T15:11 | Upgraded PDF parser to Gemini 1.5 Flash |
`;

content = content.replace(/## PHASE 7: 🤖 AI & AUTOMATION ENGINE \([\s\S]*?(?=## PHASE 8: 🖥️ FRONTEND — MISSING PAGES|$)/, replacement + '\n\n');

fs.writeFileSync(filePath, content);
console.log('Fixed worker_brain.md for Phase 7');
