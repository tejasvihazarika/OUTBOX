# OUTBOX — ReachInbox Production Email Scheduler & Dashboard

[![Tech Stack](https://img.shields.io/badge/Stack-Express%20%7C%20TypeScript%20%7C%20BullMQ%20%7C%20Prisma%20%7C%20Redis%20%7C%20Elasticsearch%20%7C%20React%20%7C%20Tailwind-blue)](#tech-stack)
[![Status](https://img.shields.io/badge/Build-Passing-emerald)](#verification)

A production-grade full-stack cold email job scheduler and monitoring dashboard simulating ReachInbox.ai's email infrastructure. Features delayed queue processing, server restart persistence, Redis-backed hourly per-sender rate limiting, Elasticsearch full-text search, Nodemailer Ethereal SMTP multi-sender delivery, Slack OAuth rate-limit notifications, and Google OAuth authentication.

---

## 📁 Monorepo Structure

```text
OUTBOX/
├── backend/                  # Node.js + Express + TypeScript API & BullMQ Worker
│   ├── prisma/               # Database Schema (MySQL ORM)
│   │   └── schema.prisma     # Models: EmailJob, SenderAccount, SlackIntegration, User
│   ├── src/
│   │   ├── config/           # Type-safe Environment Configuration
│   │   ├── queue/            # BullMQ Queue, Worker & Startup Reconciliation
│   │   ├── routes/           # REST API Routes, Google Auth, Slack OAuth & Bull Board Router
│   │   ├── services/         # Prisma DB, Redis, Elasticsearch, Mailer (Nodemailer), Slack & RateLimiter
│   │   └── index.ts          # Express Server Bootstrap & Worker Launcher
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # React (Vite) + TypeScript + Tailwind CSS UI
│   ├── src/
│   │   ├── components/       # Reusable UI Components (Button, Input, Modal, Badge, Toast, Skeleton, Header, ComposeModal)
│   │   ├── pages/            # Dashboard & Login Pages
│   │   ├── lib/              # Axios Typed API Client
│   │   ├── types/            # Shared TypeScript Payload & Response Interfaces
│   │   ├── App.tsx           # App Router & State Manager
│   │   └── main.tsx          # Google OAuth Provider & Root Render
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── docker-compose.yml        # Multi-container Infra (Redis 7, MySQL 8, Elasticsearch 8)
└── README.md                 # Complete Architecture & Setup Guide
```

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js, TypeScript
- **Queue & Async Jobs:** BullMQ backed by IORedis (delayed jobs; no cron)
- **Database:** MySQL 8.0 with Prisma ORM
- **Full-Text Search:** Elasticsearch 8.11 (`@elastic/elasticsearch`)
- **Email Transport:** Nodemailer configured against Ethereal Email (supports multi-sender accounts)
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, PapaParse
- **Queue Dashboard:** `@bull-board/express` mounted at `/admin/queues`
- **Infra:** Docker Compose for Redis, MySQL, and Elasticsearch

---

## ⚡ Quick Start Guide

### Prerequisites

- Node.js (v18.x or v20.x) & `npm`
- Docker Desktop / Docker Compose

### 1. Launch Infrastructure via Docker Compose

In the monorepo root directory (`OUTBOX/`), start Redis, MySQL, and Elasticsearch:

```bash
docker compose up -d
```

Verify containers are running:
- **Redis:** `localhost:6379`
- **MySQL:** `localhost:3306` (User: `outbox`, Pass: `outbox`, DB: `outbox`)
- **Elasticsearch:** `http://localhost:9200`

### 2. Configure Environment Variables

Create `.env` inside `backend/` (or copy defaults):

```env
PORT=4000
NODE_ENV=development
DATABASE_URL="mysql://outbox:outbox@localhost:3306/outbox"
REDIS_URL="redis://localhost:6379"
ELASTICSEARCH_NODE="http://localhost:9200"

WORKER_CONCURRENCY=5
MIN_DELAY_MS_BETWEEN_SENDS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=10

JWT_SECRET="outbox-super-secret-key-2026"
FRONTEND_URL="http://localhost:5173"

# Third-Party OAuth Placeholders (See guides below)
GOOGLE_CLIENT_ID="PLACEHOLDER_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="PLACEHOLDER_GOOGLE_CLIENT_SECRET"
SLACK_CLIENT_ID="PLACEHOLDER_SLACK_CLIENT_ID"
SLACK_CLIENT_SECRET="PLACEHOLDER_SLACK_CLIENT_SECRET"
SLACK_REDIRECT_URI="http://localhost:4000/api/auth/slack/callback"
```

### 3. Initialize Database & Start Backend

Navigate into `backend/`:

```bash
cd backend
npm install
npm run prisma:push    # Pushes database schema to MySQL
npm run dev            # Launches Express Server + BullMQ Worker
```

On backend startup:
1. MySQL database tables (`email_jobs`, `sender_accounts`, `slack_integrations`, `users`) are initialized.
2. Elasticsearch index `email_jobs` is created with mappings.
3. If no SMTP senders exist, **2 Ethereal Email test accounts** are automatically created and logged in terminal.
4. BullMQ worker launches with `WORKER_CONCURRENCY`.
5. Startup reconciliation reconciles any pending DB jobs.

Backend URL: `http://localhost:4000`  
Live Bull Board Queue Dashboard: `http://localhost:4000/admin/queues`

### 4. Start Frontend Dashboard

Open a new terminal window in `frontend/`:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

---

## 🔑 Third-Party OAuth Setup Instructions

### 1. Google OAuth Credentials Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Navigate to **APIs & Services** > **Credentials**.
4. Click **Create Credentials** > **OAuth client ID**.
5. Select Application type: **Web application**.
6. Set Name to `ReachInbox Outbox`.
7. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173`
   - `http://localhost:4000`
8. Under **Authorized redirect URIs**, add:
   - `http://localhost:5173`
   - `http://localhost:4000/api/auth/google`
9. Copy your generated **Client ID** and **Client Secret**.
10. Update `backend/.env` with `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`, and update `frontend/.env` with `VITE_GOOGLE_CLIENT_ID`.

*(Note: The frontend also includes a one-click "Enter Dashboard as Demo Admin" button for immediate evaluation if Google credentials are not yet configured).*

### 2. Slack API App & OAuth Webhook Setup

1. Go to the [Slack API Apps Console](https://api.slack.com/apps).
2. Click **Create New App** > **From scratch**.
3. Set App Name to `Outbox RateLimit Notifier` and choose your workspace.
4. Under **OAuth & Permissions**:
   - Scroll to **Redirect URLs**, click **Add New Redirect URL**, and enter:  
     `http://localhost:4000/api/auth/slack/callback`
   - Scroll to **Scopes** > **Bot Token Scopes** and add:
     - `incoming-webhook`
     - `chat:write`
5. Navigate to **Basic Information** > **App Credentials**:
   - Copy **Client ID** and **Client Secret**.
6. Update `backend/.env`:
   - `SLACK_CLIENT_ID="<your_client_id>"`
   - `SLACK_CLIENT_SECRET="<your_client_secret>"`
7. In the Outbox Dashboard header, click **Connect Slack**. This executes the full OAuth 2.0 flow, retrieves the incoming webhook URL, and saves it against your tenant in MySQL. When rate limits are triggered, alerts will automatically post to Slack!

---

## 📐 Architecture Overview

### 1. BullMQ Delayed-Job Scheduling (No Cron)
- When a batch of emails is scheduled, each email is saved in MySQL with status `SCHEDULED`.
- The backend computes the delay (`scheduled_time - now()`) and enqueues a delayed job into BullMQ using `emailQueue.add('send-email', { emailJobId }, { jobId: emailJobId, delay })`.
- BullMQ uses Redis sorted sets (`zset`) under the hood to manage delayed jobs efficiently. When the delay expires, BullMQ automatically moves the job to the active worker queue. No cron jobs or polling tickers are used.

### 2. Server Restart Persistence & Idempotency
- **Persistence:** Because BullMQ persists job state inside Redis, any scheduled future jobs remain intact across server or container restarts (`docker compose restart`).
- **Startup Reconciliation:** On backend startup, `reconcileScheduledJobs()` queries MySQL for any rows marked `SCHEDULED` or `RESCHEDULED`. It checks if a corresponding job exists in BullMQ (`emailQueue.getJob(jobId)`). If found, it preserves the existing Redis job without re-adding. If missing (e.g. lost Redis state or offline DB rows), it re-enqueues the job with the remaining delay (`scheduled_time - now()`).
- **Idempotency:** Unique DB job UUIDs are used as BullMQ `jobId`s to prevent duplicate enqueueing. Before worker send execution, an explicit MySQL status guard checks `if (status !== 'SCHEDULED' && status !== 'RESCHEDULED') skip;`, eliminating double-sends even during network retries.

### 3. Redis-Backed Per-Sender Hourly Rate Limiting
- When a worker picks up a job, it evaluates `checkSenderRateLimit(senderEmail)` before sending.
- Uses a Redis counter key format: `ratelimit:{sender}:{YYYYMMDDHH}` with a TTL equal to the seconds remaining in the current UTC hour.
- If `currentCount < MAX_EMAILS_PER_HOUR_PER_SENDER`:
  - Increments counter (`INCR`), sends email via Nodemailer, sets status `SENT`, updates Elasticsearch.
- If `currentCount >= MAX_EMAILS_PER_HOUR_PER_SENDER`:
  - **Does NOT drop or fail the job.**
  - Calculates the exact timestamp of the beginning of the next hour window (`nextHourTime`).
  - Updates DB status to `RESCHEDULED` and sets new `scheduledTime`.
  - Re-adds job to BullMQ with delay until `nextHourTime`.
  - Triggers `notifySlack(senderEmail, message)` posting an alert to the Slack webhook (if configured).

### 4. Elasticsearch Indexing & Search
- Every scheduled email is indexed into Elasticsearch (`email_jobs` index) upon creation and whenever status changes (`SCHEDULED` -> `RESCHEDULED` / `SENT` / `FAILED`).
- Search queries via `/api/emails/search?q=` perform fuzzy multi-field matches across `recipient`, `subject`, `status`, `sender`, and `body`.
- Includes a graceful MySQL fallback if Elasticsearch is temporarily offline.

---

## ✅ Feature Checklist

| Requirement Category | Feature Description | Status |
| :--- | :--- | :---: |
| **Backend** | Express + TypeScript API + BullMQ Worker monorepo structure | ✅ |
| | DB persistence via Prisma ORM (`EmailJob`, `SenderAccount`, `SlackIntegration`, `User`) | ✅ |
| | BullMQ delayed queue scheduling (`scheduled_time - now()`), zero cron | ✅ |
| | Server restart persistence & startup reconciliation logic | ✅ |
| | Dual-level Idempotency (unique BullMQ `jobId` + DB status guard) | ✅ |
| | Redis-backed hourly per-sender rate limiting (`MAX_EMAILS_PER_HOUR_PER_SENDER`) | ✅ |
| | Minimum inter-send delay via BullMQ limiter (`MIN_DELAY_MS_BETWEEN_SENDS`) | ✅ |
| | Configurable worker concurrency (`WORKER_CONCURRENCY` env) | ✅ |
| | Rescheduling cap-exceeded jobs into next hour window without dropping | ✅ |
| | Slack OAuth flow & `notifySlack` alert posting on rate limit hit | ✅ |
| | Elasticsearch indexing & full-text search endpoint (`/api/emails/search?q=`) | ✅ |
| | Nodemailer multi-sender Ethereal SMTP with auto-generated test accounts | ✅ |
| | Live Bull Board dashboard mounted at `/admin/queues` | ✅ |
| **Frontend** | React 18 + Vite + TypeScript + Tailwind CSS modern SaaS UI | ✅ |
| | Google OAuth Login & token verification backend flow | ✅ |
| | Top header with user avatar, profile info, Slack OAuth status, & logout | ✅ |
| | Scheduled Emails tab & Sent Emails tab with status badges | ✅ |
| | Compose New Email modal with PapaParse CSV lead parser & email validator | ✅ |
| | Datetime start picker, inter-email delay picker, & hourly limit controls | ✅ |
| | Elasticsearch live search bar with index source indicator | ✅ |
| | Table loading skeletons, empty states, and toast notifications | ✅ |
| | Auto-refreshing status polling (5s interval) | ✅ |

---

## 💡 Assumptions, Shortcuts & Trade-offs

1. **Single-Tenant vs Multi-Tenant Slack Tokens:** Slack OAuth stores incoming webhook URLs in `SlackIntegration` table associated with tenant/sender ID. In this assignment demo, it defaults to tenant `'default'`, making it easy to test with a single workspace.
2. **Elasticsearch Security Mode:** In `docker-compose.yml`, Elasticsearch runs with `xpack.security.enabled=false` for frictionless local developer setup without needing SSL certificate generation.
3. **Ethereal SMTP Sandbox:** Nodemailer connects to Ethereal Email test accounts. Actual emails are safely captured in Ethereal inbox sandboxes and logged as click-through preview URLs in the worker logs.
4. **Local Time vs UTC:** All rate-limiting hour windows (`ratelimit:{sender}:{YYYYMMDDHH}`) use UTC timestamps to avoid timezone offset edge cases across distributed servers.
