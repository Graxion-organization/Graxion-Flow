# Graxion Flow — AI-Powered Social Media Automation Platform

> 🤖 **Managed & Committed via Google AI**  
> *Ye commit aur codebase updates Google AI Studio dwara kiya gaya hai.*

---

## 🚀 About Graxion Flow

**Graxion Flow** is a unified, production-grade social media automation and omnichannel customer engagement platform. It allows businesses and creators to automate, schedule, manage, and respond across multiple channels from a single intelligent control hub.

### Supported Channels & Integrations:
- **WhatsApp Cloud API** (WABA, official templates, interactive messages, multi-agent AI copilot)
- **Instagram** (Direct messages, comment automation, story mentions, analytics)
- **Facebook Pages & Messenger** (Post automation, webhook listeners, comment-to-DM triggers)
- **YouTube** (Video publishing, community interactions, analytics tracking)
- **LinkedIn** (Post scheduling, company page automation)
- **Telegram** (Bot orchestration, webhook management)

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Zustand
- **Backend**: Node.js, Express.js (REST API + Webhooks)
- **Database**: MongoDB (Atlas)
- **Queue & Async Jobs**: Redis, BullMQ
- **AI Engine**: Google Gemini API, OpenAI GPT-4o, Anthropic Claude
- **Deployment**: Render / Docker / Vercel

---

## 📁 Repository Structure

```
.
├── backend/                  # Express REST API, Webhooks, Schedulers & Workers
│   ├── src/
│   │   ├── controllers/      # Omnichannel route handlers (WhatsApp, IG, FB, YT, etc.)
│   │   ├── models/           # Mongoose schemas (User, Organization, Flow, Conversation)
│   │   ├── services/         # Automation engines, AI orchestrators, rate limiters
│   │   ├── queues/           # BullMQ job queues
│   │   └── workers/          # Background worker processes
├── frontend/                 # React + Vite Single Page Application
│   ├── src/
│   │   ├── components/       # Flow builder, analytics panels, modals
│   │   ├── pages/            # Omnichannel dashboard views
│   │   └── store/            # State management
├── docs/                     # Meta App Review and compliance docs
└── docker-compose.yml        # Local development environment
```

---

## 📝 Commit Info

- **Source**: Google AI Studio Build Engine
- **Status**: Verified & Synced
- **Branch**: main
