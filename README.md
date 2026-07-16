# Topdignus

A business web portal built as an ERP+CRM system for a fire-resistance fitting supplier.

Covers the full sales cycle — quote generation → order management → customer tracking — with real-time ERP sync (ECOUNT) throughout.

---

## Tech Stack

| Area | Technology |
|---|---|
| Framework | Next.js 16.1.7 (App Router) |
| Runtime | React 19 + TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database / Auth | Supabase + NextAuth v4 |
| Email | Resend |
| Excel export | ExcelJS |
| OCR | Google Drive API (OAuth2) |
| AI | Gemini API (article → structured data extraction) |
| ERP | ECOUNT integration |
| Dev tooling | Built with [Claude Code](https://claude.com/claude-code) |

---

## Hosting

| Item | Detail |
|---|---|
| Hosting | Vercel (free tier) |
| Domain | `topdignus-demo.vercel.app` — no custom domain, demo instance only |
| Database | Supabase (separate free-tier project, fully isolated from production) |

---

## Deployment (Vercel)

- **Hosting**: Vercel
- **Cron Jobs** (`vercel.json`, runs daily at UTC 00:00 / KST 09:00)
  - `GET /api/crawl` — KICT + Building Code crawler
  - `GET /api/cron/delivery-reminder` — delivery reminder notifications

---

## Environment Variables (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXTAUTH_SECRET
RESEND_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
GEMINI_API_KEY
ECOUNT_COM_CODE
ECOUNT_USER_ID
ECOUNT_API_CERT_KEY        # expires 2027-05-05
ECOUNT_WORKER_URL          # Render.com proxy URL
ECOUNT_WORKER_SECRET       # proxy auth secret
LAW_API_KEY=topdignus
CRON_SECRET                # registered in Vercel dashboard
```

---

## External Services

| Service | Purpose |
|---|---|
| Supabase | DB + Storage (`order-images` bucket) + RLS |
| Google Drive | OCR (OAuth2, scope: drive.file, GCP project: `fabled-essence-494307-t2`) |
| Resend | Email sending (from: `topdi@topdignus.co.kr`) |
| ECOUNT | ERP sync for orders, purchases, sales, and quotes |
| Render.com | Fixed-IP proxy for ECOUNT (`74.220.48.30`, monitored via UptimeRobot) |
| Building Code Open API | Key: `topdignus` (IP re-registration required if deployment changes) |

---

## Database Migration Order

Run these files in sequence via the Supabase SQL Editor:

```
001_users.sql
002_orders.sql
003_crawler.sql
004_prices.sql
005_customers.sql
006_duct.sql
007_quotes.sql
008_sales_leads.sql
009_sales_leads_seed.sql
010_fire_blanket.sql
011_fire_blanket_orders.sql
012_fire_blanket_quotes.sql
013_order_memos.sql
014_sales_accounts.sql
```

---

## Live Demo

**https://topdignus-demo.vercel.app/**

A fully working instance running on fake data only — no connection to production or any live business data.

Admin portal: **https://topdignus-demo.vercel.app/login**
`username: demo` / `password: password`

To spin up a separate copy of this demo, see [`docs/DEMO_SETUP.md`](docs/DEMO_SETUP.md).

---

## SEO

- Naver Search Advisor: registered
- Daum Search: registered
- Sitemap: `https://topdignus.co.kr/sitemap.xml`
