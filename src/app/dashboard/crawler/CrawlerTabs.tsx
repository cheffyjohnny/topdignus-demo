"use client";

import { useState } from "react";

export type CrawlRow = {
  id: string;
  title: string;
  type: string | null;
  department: string | null;
  announced_at: string | null;
  source_url: string | null;
  created_at: string;
};

export type CrawlLog = {
  ran_at: string;
  status: string;
  items_collected: number;
  new_items: number;
  error_message: string | null;
};

type Props = {
  kictItems: CrawlRow[];
  kfiItems: CrawlRow[];
  lawItems: CrawlRow[];
  kictLog: CrawlLog | null;
  kfiLog: CrawlLog | null;
  lawLog: CrawlLog | null;
  defaultTab?: string;
};

const TABS = [
  { key: "kict", label: "KICT 인정서" },
  { key: "kfi", label: "KFI 방화포" },
  { key: "law", label: "법령" },
];

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}

function CrawlTable({ items }: { items: CrawlRow[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 py-8 text-center">수집된 데이터가 없습니다.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 font-semibold text-gray-500 w-16">구분</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-500">제목</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-500 w-32">부서</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-500 w-32">공표일</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-500 w-16">링크</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4">
                {item.type && (
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-[#e8f0fb] text-[#014A99] whitespace-nowrap">
                    {item.type}
                  </span>
                )}
              </td>
              <td className="py-3 px-4 text-gray-800 font-medium">{item.title}</td>
              <td className="py-3 px-4 text-gray-500">{item.department ?? "—"}</td>
              <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDate(item.announced_at)}</td>
              <td className="py-3 px-4">
                {item.source_url ? (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#014A99] hover:underline"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RunLog({ log }: { log: CrawlLog | null }) {
  if (!log) return (
    <div className="py-3 mb-4 border-b border-gray-100 text-xs text-gray-400">
      실행 기록 없음
    </div>
  );

  const ranAt = new Date(log.ran_at).toLocaleString("ko-KR", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="py-3 mb-4 border-b border-gray-100 flex items-center gap-4 text-xs text-gray-400">
      <span className={`flex items-center gap-1 font-medium ${log.status === "success" ? "text-green-600" : "text-red-500"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${log.status === "success" ? "bg-green-500" : "bg-red-500"}`} />
        {log.status === "success" ? "성공" : "실패"}
      </span>
      <span>마지막 실행: <span className="text-gray-600">{ranAt}</span></span>
      <span>수집 <span className="text-gray-600">{log.items_collected}건</span></span>
      <span>신규 <span className={`font-semibold ${log.new_items > 0 ? "text-[#014A99]" : "text-gray-600"}`}>{log.new_items}건</span></span>
      {log.error_message && <span className="text-red-400 truncate max-w-xs">{log.error_message}</span>}
    </div>
  );
}

export default function CrawlerTabs({ kictItems, kfiItems, lawItems, kictLog, kfiLog, lawLog, defaultTab }: Props) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? "kict");

  const counts: Record<string, number> = {
    kict: kictItems.length,
    kfi: kfiItems.length,
    law: lawItems.length,
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? "border-[#014A99] text-[#014A99]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-[#e8f0fb] text-[#014A99]">
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Run log */}
      {activeTab === "kict" && <RunLog log={kictLog} />}
      {activeTab === "kfi"  && <RunLog log={kfiLog}  />}
      {activeTab === "law"  && <RunLog log={lawLog}  />}

      {/* Tab content */}
      {activeTab === "kict" && <CrawlTable items={kictItems} />}
      {activeTab === "kfi"  && <CrawlTable items={kfiItems}  />}
      {activeTab === "law"  && <CrawlTable items={lawItems}  />}
    </div>
  );
}
