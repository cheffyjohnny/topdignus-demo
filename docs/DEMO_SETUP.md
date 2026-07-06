# Topdignus — Demo Environment Setup Guide

This guide explains how to spin up a standalone demo instance of Topdignus using entirely fake data, with no connection to the production database or any live business data.

**Demo login:** `username: demo` / `password: password`

---

## Overview

The demo uses the same codebase as production. You only need:

1. A new (free-tier) Supabase project
2. A new Vercel project pointing at the same GitHub repo
3. The environment variables listed below

No code changes are required.

---

## Step 1 — Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project (any name, e.g. `topdignus-demo`).
2. Note down:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Service Role Key** → `SUPABASE_SERVICE_ROLE_KEY`
3. Open the **SQL Editor** and run each migration file in order:

```
supabase/001_users.sql
supabase/002_orders.sql
supabase/003_crawler.sql
supabase/004_prices.sql
supabase/005_customers.sql
supabase/006_duct.sql
supabase/007_quotes.sql
supabase/008_sales_leads.sql
supabase/010_fire_blanket.sql
supabase/011_fire_blanket_orders.sql
supabase/012_fire_blanket_quotes.sql
supabase/013_order_memos.sql
supabase/014_sales_accounts.sql
```

> **Skip** `009_sales_leads_seed.sql` — demo data is loaded separately in the next step.

4. After all migrations succeed, run the demo seed:

```
supabase/demo_seed.sql
```

This inserts fake customers, orders, quotes, sales leads, and one demo admin account.

---

## Step 2 — Create a New Vercel Project

1. Go to [vercel.com](https://vercel.com) and click **Add New → Project**.
2. Import the same GitHub repository.
3. Set the **Framework Preset** to **Next.js**.
4. Add the environment variables below under **Settings → Environment Variables**.

---

## Step 3 — Environment Variables

### Required (core functionality)

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API |
| `NEXTAUTH_SECRET` | Any random string — run `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your Vercel deployment URL (e.g. `https://topdignus-demo.vercel.app`) |
| `NEXT_PUBLIC_DEMO_MODE` | Set to `true` — shows a "LIVE DEMO" banner at the top of the dashboard (post-login). Leave unset in production. |

### Optional (features disabled without these)

| Variable | Feature affected | Behaviour without it |
|---|---|---|
| `RESEND_API_KEY` | Quote / order email sending | Email buttons silently no-op |
| `GOOGLE_CLIENT_ID` | OCR (image → text extraction) | OCR button hidden |
| `GOOGLE_CLIENT_SECRET` | OCR | OCR button hidden |
| `GOOGLE_REFRESH_TOKEN` | OCR | OCR button hidden |
| `ECOUNT_COM_CODE` | ERP sync (ECOUNT) | ERP sync button hidden |
| `ECOUNT_USER_ID` | ERP sync | ERP sync button hidden |
| `ECOUNT_API_CERT_KEY` | ERP sync | ERP sync button hidden |
| `ECOUNT_WORKER_URL` | ERP sync proxy | ERP sync button hidden |
| `ECOUNT_WORKER_SECRET` | ERP sync proxy | ERP sync button hidden |
| `LAW_API_KEY` | Building code crawler | Crawler returns empty |
| `CRON_SECRET` | Scheduled cron jobs | Cron endpoints unauthenticated |

For a read-only portfolio demo, **only the four required variables are needed.**

---

## Step 4 — Deploy

1. Click **Deploy** in Vercel.
2. Once the build passes, visit your deployment URL.
3. Log in with:
   - **Username:** `demo`
   - **Password:** `password`

---

## What the Demo Data Includes

All data is 100% fictional. Company names, phone numbers, addresses, and project names do not represent real businesses or individuals.

| Section | Volume |
|---|---|
| Customers | 5 fictional Australian construction companies |
| Sales accounts | 6 fictional accounts with contact details |
| Pipe orders | 12 orders across all statuses (delivered / ordered / new / cancelled) |
| Duct orders | 6 orders across all statuses |
| Pipe quotes | 8 quotes (confirmed / sent / in-review / cancelled) |
| Duct quotes | 4 quotes |
| Sales leads | 15 leads across major Australian cities |
| Shared memos | 3 internal notes |

Australian city and suburb names are used for project addresses (Sydney, Melbourne, Brisbane, Perth, Adelaide, etc.).

---

## Limitations of the Demo Environment

| Feature | Status in demo |
|---|---|
| Order / quote CRUD | Fully functional |
| Status transitions | Fully functional |
| Excel export | Fully functional |
| Email sending | Disabled (no Resend key) |
| OCR (image upload → text) | Disabled (no Google credentials) |
| ECOUNT ERP sync | Disabled (no ECOUNT credentials) |
| Cron jobs (crawler, reminders) | Not triggered automatically |
| File / image attachments | Depends on Supabase storage bucket setup |

---

## Supabase Storage (optional)

If you want file/image upload to work in the demo:

1. Go to **Storage** in your Supabase project.
2. Create a bucket named `order-images`.
3. Set the bucket to **Public** (or configure RLS as needed).

Without this, uploads will fail silently and existing attachment links will not resolve.

---

## Notes for Reviewers

- This project is a production ERP/CRM system built from scratch for a fire-resistance product supplier in Korea, replacing manual Excel workflows across order management, product catalogue, and customer data.
- The demo environment is a sanitised copy with no real customer or order data.
- The app UI is in Korean; the demo data has been written in English for reviewability.
- Tech stack: Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS v4 · Supabase · NextAuth v4
