export default function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;

  return (
    <div className="w-full bg-[#0a1f3d] text-white px-4 py-3 text-xs sm:text-sm">
      <div className="max-w-[1536px] flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <span className="inline-flex items-center gap-1.5 font-semibold text-amber-300 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
          LIVE DEMO
        </span>
        <p className="opacity-90 leading-relaxed">
          You&apos;re viewing a portfolio demo of a full ERP/CRM system built from scratch for a
          fire-resistance product supplier, replacing manual Excel workflows across order
          management, product catalogue, and customer data. All data below is fictional (no
          real customer or business data). Built with Next.js 16 (App Router), React 19,
          TypeScript, Tailwind CSS v4, Supabase, and NextAuth. The interface is in Korean —
          for the best experience, we recommend using Chrome, whose built-in translation
          feature lets you browse it in your own language.
        </p>
      </div>
      <div className="max-w-[1536px] flex items-center gap-4 mt-1.5 pt-1.5 border-t border-white/10">
        <span className="inline-flex items-center gap-1.5 font-semibold text-sky-300 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />
          README
        </span>
        <p className="opacity-90 leading-relaxed">
          Curious how this is built?{" "}
          <a href="/how-it-works" className="underline font-medium hover:text-sky-300">
            Read the engineering overview
          </a>{" "}
          — the problem, the workflow, and the key technical decisions behind it.
        </p>
      </div>
    </div>
  );
}
