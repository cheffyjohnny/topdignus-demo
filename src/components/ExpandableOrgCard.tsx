"use client";

import { useState } from "react";

export type OrgCrawlItem = {
  title: string;
  announced_at: string | null;
  source_url: string | null;
  type: string | null;
};

type Props = {
  role: string;
  name: string;
  desc: string;
  link: string;
  linkLabel: string;
  items: OrgCrawlItem[];
  lastUpdated: string | null; // ISO date string of most recent item
};

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return "업데이트 정보 없음";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "오늘 업데이트";
  if (diffDays <= 10) return `${diffDays}일 전 업데이트`;
  return `${formatDate(dateStr)} 업데이트`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ExpandableOrgCard({
  role,
  name,
  desc,
  link,
  linkLabel,
  items,
  lastUpdated,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:border-[#014A99] hover:shadow-md">
      {/* Card Header — flex-1 so all cards fill the grid row height equally */}
      <div className="flex-1 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#e8f0fb] text-[#014A99] mb-3">
              {role}
            </span>
            <h3 className="text-base font-bold text-gray-900 mb-2">{name}</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-3">{desc}</p>

            <div className="flex items-center gap-3 flex-wrap">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#014A99] hover:underline"
              >
                {linkLabel} →
              </a>
              {lastUpdated && (
                <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                  최신 {daysAgo(lastUpdated)}
                </span>
              )}
            </div>
          </div>

          {items.length > 0 && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-[#014A99] bg-[#e8f0fb] hover:bg-[#d4e4f7] px-3 py-1.5 rounded-full transition-colors"
              aria-expanded={open}
            >
              최신 {items.length}건
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Panel */}
      {open && items.length > 0 && (
        <div className="border-t border-gray-100 bg-[#f8fafd] px-6 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            최근 수집 데이터
          </p>
          <ul className="flex flex-col gap-2">
            {items.map((item, i) => (
              <li key={i} className="flex items-start justify-between gap-3 group">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-[#014A99] opacity-50" />
                  <span className="text-sm text-gray-700 leading-snug truncate">{item.title}</span>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {item.announced_at && (
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(item.announced_at)}
                    </span>
                  )}
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      title="원본 보기"
                    >
                      <svg className="w-3.5 h-3.5 text-[#014A99]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-gray-200">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-[#014A99] hover:underline"
            >
              원본 사이트에서 전체 목록 보기 →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
