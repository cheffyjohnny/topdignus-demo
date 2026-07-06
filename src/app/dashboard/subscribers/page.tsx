import { supabaseServer } from "@/lib/supabase-server";
import SubscriberTable, { Subscriber } from "./SubscriberTable";

export const metadata = { title: "구독자 관리 | Topdignus 관리자" };

export default async function SubscribersPage() {
  const { data } = await supabaseServer
    .from("newsletter_subscribers")
    .select("id, name, email, company, status, requested_at, approved_at")
    .order("requested_at", { ascending: false });

  const subscribers = (data ?? []) as Subscriber[];
  const pendingCount = subscribers.filter((s) => s.status === "pending").length;
  const activeCount = subscribers.filter((s) => s.status === "active").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">구독자 관리</h1>
        <p className="text-sm text-gray-500 mt-1">
          전체 {subscribers.length}명 · 승인 {activeCount}명
          {pendingCount > 0 && (
            <span className="ml-2 text-yellow-600 font-medium">· 대기 {pendingCount}명</span>
          )}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <SubscriberTable initialSubscribers={subscribers} />
      </div>
    </div>
  );
}
