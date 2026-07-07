import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works | Topdignus ERP/CRM",
  description: "Architecture and mechanism overview of the Topdignus ERP/CRM system.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-white mb-3">{title}</h2>
      <div className="text-sm text-slate-300 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#0a1120] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-amber-300 font-semibold text-xs tracking-widest mb-2">
          ENGINEERING OVERVIEW
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">
          Topdignus — Full ERP/CRM Built From Scratch
        </h1>
        <p className="text-slate-300 leading-relaxed mb-12">
          This page explains what the system does and how it&apos;s built, for anyone reviewing
          the <a href="/login" className="underline hover:text-amber-300">live demo</a>. All
          business data in the demo is fictional; the mechanisms described below are real.
        </p>

        <Section title="Problem">
          <p>
            A fire-resistance product distributor ran its entire sales cycle — quotes, purchase
            orders, pricing, customer records — through manual Excel files and phone/email
            coordination. There was no shared source of truth, pricing errors were common, and
            syncing with the company&apos;s ERP (ECOUNT) required manual re-entry.
          </p>
        </Section>

        <Section title="What was built">
          <p>
            A single Next.js application replacing that entire workflow: quote generation →
            order management → ERP sync → customer/sales tracking, with role-based dashboards
            for admins, dealers, and sales reps.
          </p>
        </Section>

        <Section title="Core workflow">
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <strong className="text-white">Quote.</strong> Staff build a quote from a
              structured item table (pipe/duct/fire-blanket products), with unit prices resolved
              per manufacturer and per customer discount tier.
            </li>
            <li>
              <strong className="text-white">Order.</strong> A confirmed quote converts into an
              order in one click, carrying its line items forward. Orders can also be created
              directly, including from a photo of a handwritten/printed purchase sheet — the
              image is OCR&apos;d and parsed into structured line items for review before saving.
            </li>
            <li>
              <strong className="text-white">Documents.</strong> Purchase orders and quotes are
              generated as formatted Excel workbooks and PDFs from a maintained template, with
              per-manufacturer sheet variants and computed pricing formulas.
            </li>
            <li>
              <strong className="text-white">ERP sync.</strong> Order, purchase, and sales
              events are pushed to the company&apos;s ERP system automatically, so the same data
              never has to be typed twice.
            </li>
            <li>
              <strong className="text-white">Tracking.</strong> Order status (received → ordered
              → delivered) and sales-lead status are tracked with a full history timeline, and
              roll up into monthly/yearly revenue and margin reports.
            </li>
          </ol>
        </Section>

        <Section title="Automated compliance-data crawling">
          <p>
            Separately from the sales workflow, the system runs scheduled crawlers that keep the
            company&apos;s regulatory/compliance data current automatically — no one has to check
            government or certification sites by hand. Unlike the fictional business data
            elsewhere in this demo, this is a real, live pipeline.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong className="text-white">KICT (Korea Institute of Civil Engineering and
              Building Technology).</strong> Fire-resistance penetration seal (내화채움구조)
              product certifications — new, changed, and cancelled listings.
            </li>
            <li>
              <strong className="text-white">KFI (Korea Fire Institute).</strong> Fire-blanket
              (방화포) performance certification approvals.
            </li>
            <li>
              <strong className="text-white">Ministry of Government Legislation Open API.</strong>{" "}
              The specific statutes and administrative rules that govern these products (Building
              Act, its enforcement decree, fire/evacuation structure rules, fire-safety
              installation law, and the material quality-certification standard), tracked for
              revision dates.
            </li>
          </ul>
          <p>
            KICT and the legislation feed run daily via a Vercel Cron job; KFI runs on manual
            trigger due to a legacy-TLS quirk in its server that a scheduled serverless job
            can&apos;t negotiate around. When a crawler finds a new item, it emails an internal
            notification automatically. Results are exposed two ways: a public-facing page shows
            the latest entries per source with &quot;updated N days ago&quot; badges, and an admin
            dashboard tab gives staff the full history plus manual re-run controls.
          </p>
        </Section>

        <Section title="Notable engineering decisions">
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong className="text-white">Legacy ERP behind a fixed-IP proxy.</strong> The
              ERP&apos;s API only accepts requests from allow-listed IPs, which doesn&apos;t fit
              serverless hosting (no stable outbound IP). A small proxy service with a fixed IP
              relays requests, so the main app can stay on serverless infrastructure.
            </li>
            <li>
              <strong className="text-white">Price resolution is manufacturer- and
              customer-aware.</strong> The same product can have different base costs by
              manufacturer and different sell prices by customer discount tier; pricing is
              computed from those two axes rather than hardcoded per item.
            </li>
            <li>
              <strong className="text-white">OCR-assisted data entry.</strong> Handwritten or
              printed order sheets are photographed, converted via a document OCR pipeline, and
              parsed into editable structured rows — turning a manual re-typing task into a
              review-and-confirm step.
            </li>
            <li>
              <strong className="text-white">Auditable status history.</strong> Every status
              change on an order/quote/lead appends to a JSON history array rather than
              overwriting a single field, so the full lifecycle stays queryable.
            </li>
            <li>
              <strong className="text-white">Role-based data visibility.</strong> Admin, dealer,
              and subscriber roles see different slices of the same data model, enforced at the
              session/query level rather than duplicated per-role code paths.
            </li>
          </ul>
        </Section>

        <Section title="Tech stack">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-slate-300">
            <span>Next.js 16 (App Router)</span>
            <span>React 19</span>
            <span>TypeScript 5</span>
            <span>Tailwind CSS v4</span>
            <span>Supabase (Postgres + Storage)</span>
            <span>NextAuth v4</span>
            <span>ExcelJS</span>
            <span>Google Drive OCR</span>
            <span>ERP integration</span>
            <span>Scheduled crawlers (Vercel Cron)</span>
          </div>
        </Section>

        <p className="text-xs text-slate-500 mt-16">
          <a href="/login" className="underline hover:text-amber-300">← Back to the live demo</a>
        </p>
      </div>
    </div>
  );
}
