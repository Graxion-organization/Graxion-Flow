# Graxion Flow — Production Launch Readiness & Compliance Plan

## Executive Summary
Graxion Flow ke backend aur frontend ka comprehensive audit karne ke baad, project architecture **85-90% production ready** hai. Meta App Review approved hai, MongoDB Atlas aur Upstash Redis configured hain, aur SSL domain active hai. 

Lekin **compliance, webhook resilience under load, aur process orchestration** mein kuch crucial gaps hain jo live launch se pehle fix karna zaroori hai taaki Meta Webhooks fail na hon aur high volume par server crash na kare.

---

## 1. Identified Gaps (Production Launch Me Kya Kami Hai)

### 🔴 Critical Gap 1: Meta Webhook Verify Token & Secret Discrepancy
* **Issue:** `whatsappService.js` mein verify webhook `process.env.META_WEBHOOK_VERIFY_TOKEN` expect karta hai, jabki `env.example` aur controllers `WHATSAPP_VERIFY_TOKEN` refer karte hain. Agar dono me se ek bhi miss ho gaya, toh Meta Webhook handshake `403 Forbidden` throw karega.
* **Risk:** Webhook URL update ya re-verification ke time Meta reject kar dega.
* **Fix:** Fallback support add karna: `process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN`.

### 🔴 Critical Gap 2: Meta App Secret in Signature Verification
* **Issue:** `verifyWebhookSignature.js` ke andar `appSecrets` array mein:
  ```javascript
  const appSecrets = [
    process.env.INSTAGRAM_APP_SECRET,
    process.env.META_APP_SECRET,
    process.env.FACEBOOK_APP_SECRET
  ].filter(Boolean);
  ```
  `WHATSAPP_APP_SECRET` shaamil nahi tha. Agar WhatsApp webhook verify hoga aur environment variable `WHATSAPP_APP_SECRET` define hoga, toh `401 Unauthorized` signature mismatch trigger ho sakta hai.
* **Fix:** `process.env.WHATSAPP_APP_SECRET` ko signature verification secrets list mein include karna.

### 🔴 Critical Gap 3: BullMQ Worker Orchestration (Render vs VPS)
* **Issue:** Render web service single instance par jab backend deploy hota hai, `broadcastWorker.js` aur `pdfWorker.js` background processes automatically initialize nahi hote agar wo `server.js` me load na hon ya alag Render Background Worker me run na kiye jayein.
* **Fix:** 
  1. Render deployment ke liye `server.js` mein fallback worker boot logic ensure karna.
  2. Aage VPS (Docker / PM2) par switch karne ke liye verified `ecosystem.config.js` aur Docker-compose setup finalize karna.

### 🟡 Medium Gap 4: Meta Data Deletion Callback Endpoint (Compliance)
* **Issue:** Meta App Dashboard me do cheezein mandatory hoti hain:
  1. **User Data Deletion Callback URL** (POST endpoint returning confirmation code & status URL)
  2. **Data Deletion Instructions URL** (HTML/Page)
  Currently frontend par `data-deletion-policy` page hai, lekin Meta ka official automated signed POST callback (`/api/facebook/data-deletion` ya `/api/whatsapp/data-deletion`) compliant format me missing hai.
* **Fix:** Meta signed-request compliant data deletion callback endpoint implement karna jo Meta standard JSON response return kare:
  ```json
  { "url": "https://flow.graxion.in/data-deletion-policy?code=...", "confirmation_code": "..." }
  ```

### 🟡 Medium Gap 5: Public Data Deletion HTML Branding
* **Issue:** `frontend/public/data-deletion.html` me legacy name "WhatsAgent" aur green theme present hai jabki project ka official name **Graxion Flow** hai.
* **Fix:** Branding aur links ko clean Graxion Flow standard par align karna.

---

## 2. Step-by-Step Implementation Plan

### Phase 1: Meta Webhook & Security Hardening
1. **Update `whatsappService.js`**: Verify webhook token check mein `META_WEBHOOK_VERIFY_TOKEN` aur `WHATSAPP_VERIFY_TOKEN` dono ka robust fallback lagana.
2. **Update `verifyWebhookSignature.js`**: `WHATSAPP_APP_SECRET` ko secret verification pool mein add karna with zero downtime.
3. **Add Meta Data Deletion Callback Route & Controller**: 
   - Route: `POST /api/facebook/data-deletion` (also works for Instagram/Meta OAuth apps)
   - Parse Meta signed request, generate tracking confirmation code, and respond within 200ms.

### Phase 2: Upstash / Redis & BullMQ Worker Resilience
1. **Upstash Redis Optimization**: Ensure connection timeout, maxRetriesPerRequest, and BullMQ concurrency settings are optimized for cloud Redis latency.
2. **Workers Auto-Initialization**: `server.js` ke startup sequence mein broadcast worker aur webhook queue workers ko seamlessly load karna taaki Render free/starter tiers par bhi background jobs execute hon.

### Phase 3: Webhook Stress & Compliance Testing Suite
1. **Create automated webhook stress script** (`backend/tests/stress/webhookStressTest.js`):
   - Simulates 100+ concurrent Meta webhook events (DMs, statuses: sent/delivered/read, reactions).
   - Validates X-Hub-Signature-256 HMAC verification under load.
   - Measures response time (must respond `< 200ms` to Meta while processing asynchronously in Redis queue).
   - Validates duplicate detection via Redis locks (`fb_dedup`, `ig_dedup`).

### Phase 4: Production VPS Deployment Blueprint
1. Provide production-ready `docker-compose.prod.yml` and Nginx reverse proxy configuration for smooth zero-downtime transition from Render to VPS.

---

## 3. Verification & Acceptance Criteria
- [ ] All webhook endpoints return `200 OK` within `< 200ms` during concurrent burst tests.
- [ ] X-Hub-Signature-256 verification succeeds for WhatsApp, Instagram, and Facebook payloads.
- [ ] Redis Queue correctly processes and deduplicates incoming webhook events.
- [ ] Frontend compiles without any regression or lint errors.
