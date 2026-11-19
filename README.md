# Platform Admin (`/platform`)

A separate control panel for the people who **run** the platform (not the restaurants).
Sign in at **`/platform/login`**. Platform logins are a completely different identity
from restaurant logins: a restaurant token is rejected by `/api/platform/*`, and a
platform token is rejected by every restaurant API.

---

## 1. Setup (3 steps)

### 1. Update the database (additive only — nothing is dropped or rewritten)

Either:

```bash
cd server
npx prisma db push          # uses the updated prisma/schema.prisma
npx prisma generate
```

or apply the ready-made SQL:

```bash
psql "$DATABASE_URL" -f server/prisma/platform-admin.sql
cd server && npx prisma generate
```

### 2. Add to `server/.env`

```env
# First super admin — created automatically on boot if no platform admin exists yet
PLATFORM_ADMIN_EMAIL=you@yourcompany.com
PLATFORM_ADMIN_PASSWORD=ChangeMe@123
PLATFORM_ADMIN_NAME=Your Name            # optional

# Strongly recommended: its own signing key for platform sessions
PLATFORM_JWT_SECRET=a-long-random-string
```

You can also create / reset a super admin any time:

```bash
cd server
npm run platform:admin -- you@yourcompany.com 'StrongPassword1' "Your Name"
```

### 3. Restart the server, open `/platform/login`

On first boot the server also:
- copies the existing hardcoded plans (`free`, `monthly`, `yearly`) into the new
  `platform_plans` table — from then on **plans are managed in the admin**;
- links every old signup payment to its restaurant (for per-restaurant revenue);
- starts the usage tracker, the health monitor and the hourly automations.

No client `.env` change is needed — the admin uses the same `VITE_API_URL`.

---

## 2. What's in it

| Section | Path | What you can do |
|---|---|---|
| **Dashboard** | `/platform/dashboard` | Total / monthly revenue, MRR, ARR, ARPU, restaurants, paying restaurants, outlets, users, active users, GMV across all restaurants, revenue & signups (12 mo), daily revenue, subscription-status donut, plan distribution, daily active restaurants, health summary, "needs attention" list, recent signups / payments, expiring soon, top restaurants by sales |
| **Restaurants** | `/platform/restaurants` | Every restaurant with status (Active / Trial / Expiring / Expired / Trial expired / Suspended), search, filters, sort, CSV export. **Click a row** → full profile: KPIs, 30-day sales chart, owner details, outlets (GST/FSSAI, counts), users (enable/disable), payments, subscription history, feature-usage analytics, messages, follow-ups, audit log, private notes, branch limit, **Suspend / Reactivate** (signs everyone out instantly) |
| **Renewals & plans** | `/platform/renewals` | Expiring paid plans, trials ending, expired, suspended; revenue at stake; **Renew / upgrade / downgrade** (auto-priced quote, record payment, stack on expiry or start today, notify restaurant), **Extend** trial / set exact expiry, **Send reminder** (in-app + email), create renewal follow-up |
| **Messages** | `/platform/messages` | **Two-way** inbox. Start a conversation with any restaurant, reply, internal notes (hidden from the restaurant), assign to a teammate, priority, resolve / close, **broadcast** to all / trial / expiring / expired restaurants. Read receipts both ways. Restaurants reply from **Help & Support → Messages** (`/help/messages`) in their own app |
| **Follow-ups** | `/platform/follow-ups` | Create follow-ups for a restaurant, an enquiry or any contact; due date, owner, type, priority, channel. Tabs: overdue / today / upcoming / completed. Each follow-up has an **activity timeline** (log calls, emails, WhatsApp, meetings, notes), quick reschedule, **Complete with outcome + schedule the next one**, and **Send message** → posts into its own two-way conversation with the restaurant (their replies show on the follow-up) or emails a prospect |
| **Plans** | `/platform/plans` | Current pricing and the trial plan, subscriber counts and revenue per plan. Create a plan (trial / monthly / multi-month / yearly), edit price, GST, max branches, features, modules, compare-at price, show/hide on pricing page, featured, **deactivate** old plans (existing customers keep theirs), duplicate, delete unused. **Changes apply to the public checkout and the Pricing page immediately** |
| **Payments** | `/platform/payments` | Every payment: website checkout, renewals and offline payments. Filters (status, source, date, search by restaurant / invoice / UTR), totals, net / GST split, abandoned checkouts, detail drawer, **record offline payment**, CSV export |
| **Activity log** | `/platform/activity` | Feature adoption across all restaurants, which features each restaurant **uses and doesn't use**, time spent in the app, days active, **inactive for N days**, churn risk, filter "restaurants NOT using inventory" etc. Plus restaurant logins, restaurant audit trail and platform-team actions |
| **Webhooks** | `/platform/webhooks` | Every Razorpay webhook request: event, HTTP status, signature check, duration, headers, full payload; success rate; failures |
| **Website enquiries** | `/platform/enquiries` | Contact-page submissions; status pipeline (New → Contacted → Qualified → Converted / Closed), reply by email, internal notes, convert to follow-up, detects existing customers, CSV export |
| **Platform team** | `/platform/team` | Add members with roles **Super admin, Admin, Support, Finance, Viewer**, per-person permission overrides, reset password, deactivate, workload per person |
| **System health** | `/platform/health` | Overall status, DB ping + latency graph, API avg / p95 / p99, requests & 5xx per minute, status-code mix, CPU, memory, uptime, stored history (6h / 24h / 7d / 30d), slowest & busiest endpoints, **pending issues** (DB slow, error rate, failed webhooks, failed payments, unanswered messages, overdue follow-ups, stale enquiries, expired-but-active, missing email / webhook secret), unresolved server errors with stack traces |
| **Reports** | `/platform/reports` | Date-ranged complete report: revenue (monthly, by plan, source, method), signups, conversion, renewals, churn, MRR, GMV, status mix, feature adoption, support stats (first response time), follow-up completion by person, enquiry conversion, ops; CSV exports; print / save as PDF |
| **Settings** | `/platform/settings` | General (platform name, support email/phone shown to restaurants), subscription automations (reminder days, auto follow-ups, grace period, auto-suspend), messaging (auto-reply, email on reply, signature), team notifications, activity thresholds, health thresholds, security (session length, lockout); "Run automations now" |

### Automations (hourly, configurable in Settings)
- Renewal follow-up created N days before a paid plan expires.
- In-app expiry reminder on 7 / 3 / 1 days before expiry (configurable).
- Optional auto-suspend after the grace period.
- Pruning of old health snapshots / webhook logs.

---

## 3. Files

### Server
| File | Purpose |
|---|---|
| `prisma/schema.prisma` | New models: `PlatformAdmin`, `PlatformPlan`, `PlatformSubscriptionEvent`, `PlatformConversation`, `PlatformMessage`, `PlatformFollowUp`, `PlatformFollowUpActivity`, `PlatformWebhookLog`, `PlatformErrorLog`, `PlatformHealthSnapshot`, `PlatformUsageDaily`, `PlatformSetting`, `PlatformAuditLog`. Nullable additions to `Organization`, `PricingPayment`, `ContactSubmission` |
| `prisma/platform-admin.sql` | Same changes as plain SQL (additive) |
| `src/platform/*` | All platform APIs (`/api/platform/*`), auth, permissions, usage tracker, health monitor, automations |
| `src/support/support.routes.js` | Restaurant side of messaging (`/api/support/*`, Owner/Admin/Manager) |
| `src/index.js` | Mounts `/api/platform`, `/api/support`, request metrics, usage tracking, webhook logging, error logging, team alerts |
| `server.js` | Calls `bootstrapPlatform()` on start |
| `src/pricing/pricing.plans.js` | `syncPlansFromDb()` — checkout uses admin-managed plans |
| `src/pricing/pricing.routes.js` | Public `GET /api/pricing/plans` |
| `src/auth/auth.service.js` | Blocks sign-in / refresh for suspended restaurants; links the signup payment to the new organization |
| `scripts/createPlatformAdmin.js` | `npm run platform:admin` |

### Client
| File | Purpose |
|---|---|
| `src/platform/*` | The whole admin app (lazy-loaded, own auth context and token) |
| `src/profile/SupportMessages.jsx` | Restaurant inbox at `/help/messages` |
| `src/profile/HelpSupport.jsx` | "Messages with support" card + live support contact from Settings |
| `src/components/layout/ProfileMenu.jsx` | "Support messages" link |
| `src/landing/pages/Pricing.jsx` | Shows live prices from the admin |
| `src/App.jsx` | Routes `/platform/*` and `/help/messages` |

---

## 4. Notes
- **Usage tracking** reads `req.user` after each restaurant request finishes and aggregates in memory, flushing to the DB once a minute in batches — it never adds latency to a restaurant's request. Usage history starts from deployment; the restaurant profile also shows record counts per module (orders, KOTs, stock movements…) that include older history.
- **Email**: replies, reminders, invites and alerts use the existing SMTP config (`SMTP_USER` / `SMTP_PASS`). Without it, everything still works in-app and emails are only logged.
- **Webhooks**: logging wraps the existing Razorpay handler; its behaviour is unchanged.
- **Suspending** a restaurant revokes all its refresh tokens; its users can't sign in until reactivated. Data is untouched.
