import { supabaseServer } from "@/lib/supabase-server";
import CrawlerTabs, { CrawlRow, CrawlLog } from "./CrawlerTabs";

export const metadata = { title: "Regulations & Certifications | Topdignus Admin" };

async function fetchItems(source: string): Promise<CrawlRow[]> {
  const { data } = await supabaseServer
    .from("crawl_items")
    .select("id, title, type, department, announced_at, source_url, created_at")
    .eq("source", source)
    .order("announced_at", { ascending: false });
  return (data ?? []) as CrawlRow[];
}

async function fetchLastLog(source: string): Promise<CrawlLog | null> {
  const { data } = await supabaseServer
    .from("crawler_logs")
    .select("ran_at, status, items_collected, new_items, error_message")
    .eq("source", source)
    .order("ran_at", { ascending: false })
    .limit(1)
    .single();
  return data as CrawlLog | null;
}

export default async function CrawlerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;

  const [kictItems, kfiItems, lawItems, kictLog, kfiLog, lawLog] = await Promise.all([
    fetchItems("kict"),
    fetchItems("kfi"),
    fetchItems("law"),
    fetchLastLog("kict"),
    fetchLastLog("kfi"),
    fetchLastLog("law"),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Regulations & Certifications</h1>
        <p className="text-sm text-gray-500 mt-1">
          KICT {kictItems.length} · KFI {kfiItems.length} · Laws {lawItems.length}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <CrawlerTabs
          kictItems={kictItems}
          kfiItems={kfiItems}
          lawItems={lawItems}
          kictLog={kictLog}
          kfiLog={kfiLog}
          lawLog={lawLog}
          defaultTab={tab ?? "kict"}
        />
      </div>
    </div>
  );
}
