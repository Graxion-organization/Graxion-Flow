# WhatsAgent — WhatsApp AI SaaS Platform...

Full-stack SaaS platform jisme users apna WhatsApp Business number connect karke AI agents bana sakte hain jo automatically messages reply karte hain.

---

## Tech Stack 

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, Zustand, Recharts |
| Backend | Node.js, Express.js |
| Database | MongoDB (Atlas) |
| AI | OpenAI GPT-4o + Anthropic Claude |
| WhatsApp | Meta Cloud API (Official) |
| Billing | Razorpay |
| Hosting | Vercel (frontend) + Render (backend) |

---

## Features

- **Auth**: Register/Login, JWT + Refresh Token, Email verification, Forgot/Reset password, Account lockout
- **WhatsApp**: Connect Meta Business API, webhook verification, multi-account support
- **AI Agents**: Create agents with custom system prompt, choose OpenAI or Claude, test in chat, toggle on/off
- **Conversations**: Real-time inbox, search/filter, message history, close/escalate
- **Billing**: 3 plans (Starter ₹499/mo, Pro ₹1499/mo, Enterprise ₹4999/mo), Razorpay integration, payment history
- **Security**: Helmet, rate limiting, NoSQL injection protection, AES-256 token encryption, XSS protection

---

## Quick Start

### 1. Clone & Setup

```bash
git clone <your-repo>
cd whatsapp-saas
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# .env file me saari keys bharo (MongoDB URI, JWT secret, etc.)
npm install
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env
# REACT_APP_API_URL set karo
npm install
npm start
```

---

## Environment Variables (Backend)

Ye sab `.env` me set karne hain:

| Variable | Kahan milega |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas → Connect → Drivers |
| `JWT_SECRET` | Koi bhi 32+ char random string |
| `META_VERIFY_TOKEN` | Apna custom string (webhook setup me use hoga) |
| `META_APP_ID` / `META_APP_SECRET` | developers.facebook.com → App Settings |
| `OPENAI_API_KEY` | platform.openai.com → API Keys |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `RAZORPAY_KEY_ID` / `SECRET` | razorpay.com → Settings → API Keys |
| `ENCRYPTION_KEY` | Exactly 32 characters random string |
| `SMTP_*` | Gmail App Password setup karo |

---

## Meta WhatsApp Setup

1. **developers.facebook.com** pe jaao
2. New App → Business type
3. WhatsApp product add karo
4. API Setup se:
   - Phone Number ID copy karo
   - WABA ID copy karo
   - Temporary/Permanent Access Token copy karo
5. Webhook configure karo:
   - URL: `https://your-backend.onrender.com/api/whatsapp/webhook`
   - Verify Token: `.env` me `META_VERIFY_TOKEN` wali value
   - Subscribe to: `messages`

---

## Deploy

### Backend → Render

1. render.com pe jaao → New Web Service
2. GitHub repo connect karo (backend folder)
3. `render.yaml` automatically settings le lega
4. Saari env variables manually add karo
5. Deploy!

### Frontend → Vercel

1. vercel.com pe jaao
2. GitHub repo connect karo (frontend folder)
3. `REACT_APP_API_URL` = backend Render URL + `/api`
4. Deploy!

---

## Folder Structure

``` 
whatsapp-saas/
├── backend/
│   ├── src/
│   │   ├── config/database.js
│   │   ├── controllers/    # authController, webhookController, agentController...
│   │   ├── middleware/     # auth, validation, errorHandler
│   │   ├── models/         # User, Agent, WhatsappAccount, Conversation, Payment
│   │   ├── routes/         # auth, whatsapp, agents, conversations, billing
│   │   ├── services/       # aiService, whatsappService, emailService
│   │   ├── utils/          # logger, encryption, AppError
│   │   └── server.js
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/          # Dashboard, Agents, Conversations, WhatsApp, Billing, Settings
    │   ├── components/     # DashboardLayout, UI components
    │   ├── services/api.js # Axios with interceptors
    │   ├── store/index.js  # Zustand global state
    │   └── App.jsx
    └── .env.example
```

---

## Plans

| Plan | Price | Messages/mo | Agents |
|------|-------|------------|--------|
| Free | ₹0 | 100 | 1 |
| Starter | ₹499 | 1,000 | 3 |
| Pro | ₹1,499 | 5,000 | 10 |
| Enterprise | ₹4,999 | 50,000 | 50 |
