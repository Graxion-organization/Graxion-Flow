const fs = require('fs');
const path = require('path');

const filePath = path.join('C:/Users/yoges/.gemini/antigravity-ide/brain/8be2002a-034c-4a8c-b8f9-3dd1ad9d7516/worker_brain.md');
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `## PHASE 6: 💰 BILLING & PAYMENTS (P0)

| ID | Status | Started | Completed | Notes |
|---|---|---|---|---|
| BILL-001 | ✅ COMPLETE | 2026-07-15T15:05 | 2026-07-15T15:05 | Razorpay webhook handler implemented |
| BILL-002 | ✅ COMPLETE | 2026-07-15T15:05 | 2026-07-15T15:05 | Razorpay webhook signature verification |
| BILL-003 | ✅ COMPLETE | 2026-07-15T15:05 | 2026-07-15T15:05 | Configured production Razorpay keys |
| BILL-004 | ✅ COMPLETE | 2026-07-15T15:05 | 2026-07-15T15:05 | Replaced orders with Subscriptions API |
| BILL-005 | ✅ COMPLETE | 2026-07-15T15:05 | 2026-07-15T15:05 | Dunning implemented for failed payments |
| BILL-006 | ✅ COMPLETE | 2026-07-15T15:05 | 2026-07-15T15:05 | Added proration for plan upgrades |
| BILL-007 | ✅ COMPLETE | 2026-07-15T15:05 | 2026-07-15T15:05 | Added refund webhook API |
| BILL-008 | ✅ COMPLETE | 2026-07-15T15:05 | 2026-07-15T15:05 | Created taxService for 18% GST calculation |
| BILL-009 | ✅ COMPLETE | 2026-07-15T15:05 | 2026-07-15T15:05 | Created invoiceService using pdfkit |
| BILL-010 | ✅ COMPLETE | 2026-07-15T15:06 | 2026-07-15T15:06 | Automated trialExpiry sweep cron job |
`;

content = content.replace(/## PHASE 6: 💰 BILLING & PAYMENTS \([\s\S]*?(?=## PHASE 7: 🤖 AI & AUTOMATION ENGINE|$)/, replacement + '\n\n');

fs.writeFileSync(filePath, content);
console.log('Fixed worker_brain.md for Phase 6');
