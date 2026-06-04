# monptitbudget 💸

> A mobile-first household budget tracker — built solo, fullstack, used daily in production.

![React](https://img.shields.io/badge/React_18-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-0EA5E9?style=flat&logo=tailwind-css&logoColor=white)
![Deno](https://img.shields.io/badge/Deno_Edge_Functions-000000?style=flat&logo=deno&logoColor=white)

---

## Why this exists

Most budget apps are either too complex (YNAB, Bankin') or too basic (a spreadsheet). I wanted something in between: a clean, opinionated tool built around how a French household actually thinks about money — salary in, fixed charges out, daily spending tracked.

Built it entirely myself. No dev agency, no team. Every product decision, every data model, and every UX call is mine — shipped using AI-assisted development to move fast.

---

## What it does

### Core
- **Monthly budget setup** — net salary, itemized deductions, savings target → auto-computed spending envelope
- **Expense tracking** — add by amount, name, category, date; edit or delete inline
- **Month navigation** — browse any past month with full history preserved
- **Multi-account** — separate budgets per "pot" (personal, family, etc.)
- **Family sharing** — invite members to a shared account via email

### Categories & Caps
- **Two-level category system** — category + subcategory, custom colors, per-account config
- **Three cap types**: `fixed` (hard limit), `variable` (soft limit with warning threshold), `uncapped`
- **Visual gauges** — animated SVG arc per category tile, color-coded green → amber → red
- **Month-aware overrides** — set different caps for specific months (e.g. higher food budget in December)

### Bank sync (PSD2/DSP2)
- European open banking via **Enable Banking API**
- RSA-256 JWT authentication signed in a Deno Edge Function (no private key ever touches the client)
- Automatic deduplication of imported transactions
- AI-powered categorization on import

### Automation
- **AI receipt scanning** — photograph a receipt → amount + category extracted via Vision AI
- **Weekly email report** — every Monday 08:00 Paris time, a full digest is emailed automatically:
  - Week total vs. the 3 previous weeks (with % delta)
  - Category breakdown with cap consumption and status
  - Month-to-date progress bar vs. budget
  - Projected end-of-month spend based on current daily burn rate
- Scheduled via **pg_cron → pg_net → Supabase Edge Function → Resend**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React SPA (Vite)                          │
│  React 18 · TypeScript · Tailwind CSS · shadcn/ui · Recharts    │
│  React Query · React Hook Form · Zod · React Router v7          │
└──────────────────────────┬──────────────────────────────────────┘
                           │  supabase-js
┌──────────────────────────▼──────────────────────────────────────┐
│                         Supabase                                  │
│                                                                   │
│  ┌───────────────┐  ┌──────────────┐  ┌────────────────────────┐│
│  │  PostgreSQL    │  │     Auth     │  │    Edge Functions      ││
│  │  + RLS         │  │  email OTP   │  │    (Deno / TypeScript) ││
│  └──────┬────────┘  └──────────────┘  └──────────┬─────────────┘│
│         │                                          │              │
│  ┌──────▼────────┐                    ┌───────────▼────────────┐ │
│  │   pg_cron      │──── HTTP POST ───▶│ weekly-budget-report   │ │
│  │ Mon 07:00 UTC  │                    │ bank-sync (PSD2)       │ │
│  └────────────────┘                    │ scan-receipt (Vision)  │ │
│                                        │ bank-connect           │ │
│                                        │ send-invitation-email  │ │
│                                        └───────────┬────────────┘ │
└────────────────────────────────────────────────────┼─────────────┘
                                                      │
                                       ┌──────────────▼────────────┐
                                       │  External APIs             │
                                       │  Enable Banking  (PSD2)    │
                                       │  Resend          (email)   │
                                       │  Vision AI       (OCR)     │
                                       └───────────────────────────┘
```

---

## Stack decisions

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | React 18 + TypeScript + Vite | Fast iteration; type safety catches schema mismatches early |
| UI components | shadcn/ui + Radix UI | Accessible primitives, no design-system lock-in, fully customizable |
| Styling | Tailwind CSS | Dark-mode fintech aesthetic without a single hand-written CSS file |
| Server state | React Query v5 | Background refetch + optimistic updates = snappy perceived performance |
| Forms | React Hook Form + Zod | Validation at the boundary, not scattered across handlers |
| Backend | Supabase | Auth + Postgres + RLS + Realtime + Edge Functions — no custom server |
| Security | Row-Level Security | Multi-tenant isolation enforced at DB layer, not app layer |
| Serverless | Deno Edge Functions | Co-located with the DB, ~0ms cold start, TypeScript native |
| Scheduled jobs | pg_cron + pg_net | No external cron service; scheduling lives inside the database |
| Email | Resend | Excellent deliverability, clean API |
| Bank data | Enable Banking | Pan-European PSD2 aggregation, production-ready |

---

## Database schema

Schema evolves across **25+ migrations**. Core tables:

```sql
accounts                  -- budget pots (personal, family, …)
account_members           -- who has access to which account (+ role)
budgets                   -- one row per (account × month); stores salary + deductions + savings
expenses                  -- all spending, linked to a budget
expense_categories        -- two-level hierarchy (parent / child), per account
category_budget_configs   -- cap amount + threshold + color + group, per (category × month)
pending_transactions      -- bank-imported transactions awaiting manual validation
bank_connections          -- PSD2 session tokens, institution IDs, expiry dates
```

Every table is protected by Row-Level Security via a custom `has_account_access(account_id)` function — no expense is ever readable by someone who isn't a member of its account.

---

## Edge Functions

| Function | Trigger | Description |
|----------|---------|-------------|
| `weekly-budget-report` | pg_cron every Monday 07:00 UTC | Queries last 4 weeks of data, builds a rich HTML email, sends via Resend |
| `bank-sync` | Manual / on-demand | Fetches transactions from Enable Banking, deduplicates, AI-categorizes |
| `bank-connect` | Manual | Initiates PSD2 OAuth flow; signs JWT with RSA-256 in Deno's Web Crypto API |
| `scan-receipt` | On photo upload | Sends image to Vision AI, extracts amount + suggested category |
| `send-invitation-email` | Account member invite | Sends a transactional invite email via Resend |

---

## Local setup

```bash
# 1. Clone
git clone https://github.com/EricLePatron/monptitbudget.git
cd monptitbudget

# 2. Install dependencies
npm install        # or: bun install

# 3. Environment
cp .env.example .env
# → fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY

# 4. Start dev server
npm run dev
```

### Supabase Edge Function secrets
```
RESEND_API_KEY              # Resend transactional email
ENABLE_BANKING_APP_ID       # Enable Banking (PSD2)
ENABLE_BANKING_PRIVATE_KEY  # RSA private key for JWT signing
LOVABLE_API_KEY             # Vision AI for receipt scanning
```

---

## Roadmap

- [ ] iOS PWA install prompt + offline support
- [ ] Recurring expense detection (direct debits auto-categorized)
- [ ] Annual budget view with month-by-month breakdown
- [ ] Export to CSV / PDF
- [ ] Savings goals with contribution tracking
- [ ] Push notifications for budget alerts

---

*Personal project · Not open for contributions · MIT License*
