import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ExpandableOrgCard, { OrgCrawlItem } from "@/components/ExpandableOrgCard";
import { supabaseServer } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "KFI 방화포 성능인증 운영기관 | 탑디뉴스",
  description: "한국소방산업기술원(KFI)의 방화포 성능인증 현황을 실시간으로 확인하세요. 관련 법령과 인증 조회 방법도 함께 안내합니다.",
  keywords: "방화포 성능인증, KFI, 한국소방산업기술원, 소방청, 산업안전보건기준, 방화포 운영기관",
};

async function fetchKfiItems(limit: number): Promise<OrgCrawlItem[]> {
  const { data, error } = await supabaseServer
    .from("crawl_items")
    .select("title, announced_at, source_url, type")
    .eq("source", "kfi")
    .order("announced_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as OrgCrawlItem[];
}

function getLastUpdated(items: OrgCrawlItem[]): string | null {
  if (!items.length) return null;
  return items[0].announced_at ?? null;
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const KFI_LAWS = [
  {
    title: "건설현장의 화재안전기준 (소방청 고시, 2023.7.1 시행)",
    desc: "소방청이 건설현장 화재안전기준에 방화포 규정을 신설하였습니다. 화재위험작업 구간에 방화포 설치 의무가 명시되었습니다.",
  },
  {
    title: "산업안전보건기준에 관한 규칙 개정 (고용노동부, 2025.3.2 시행)",
    desc: "성능인증을 받은 방화포 사용이 법적으로 의무화되었습니다. 기존 KOSHA GUIDE(안전보건공단 기술지침) 기반 제품은 더 이상 인정되지 않습니다.",
  },
  {
    title: "방화포 성능인증 및 제품검사의 기술기준 (소방청 고시)",
    desc: "방화포의 성능인증 신청·심사·발급 및 제품검사에 관한 세부 기술기준입니다. 제품에는 3m 단위로 검사 합격 표식(스티커)이 부착되어야 합니다.",
  },
];

const howToCheck = [
  {
    step: "01",
    title: "KFI 홈페이지 접속",
    desc: "검색 사이트에서 '한국소방산업기술원'을 검색하여 공식 사이트(kfi.or.kr)에 접속합니다.",
  },
  {
    step: "02",
    title: "성능인증·제품검사 메뉴",
    desc: "메인 메뉴에서 '성능인증·제품검사' 항목을 클릭합니다.",
  },
  {
    step: "03",
    title: "공개데이터 선택",
    desc: "'공개데이터' 메뉴에서 '방화포 승인정보' 항목을 선택합니다.",
  },
  {
    step: "04",
    title: "인증 정보 확인",
    desc: "제조사·승인번호·형식·승인일자를 확인하고, 현장에 반입된 제품의 인증 표식과 대조합니다.",
  },
];

export default async function FireBlanketOrganizationsPage() {
  const kfiItems = await fetchKfiItems(10);
  const kfiLastUpdated = getLastUpdated(kfiItems);

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section
          className="py-16 text-white"
          style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)" }}
        >
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest opacity-70 mb-2">Organizations & Related Information</p>
            <h1 className="text-3xl md:text-5xl font-bold">운영기관 및 관련정보</h1>
          </div>
        </section>

        {/* 관련 기관 */}
        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              Organizations
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">관련 기관</h2>
            <p className="text-gray-500 text-sm mb-8">
              각 기관의 최신 수집 데이터를 카드를 클릭하여 확인할 수 있습니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* KFI — expandable */}
              <ExpandableOrgCard
                role="성능인증기관"
                name="한국소방산업기술원 (KFI)"
                desc="소방청 지정 방화포 성능인증 전담기관. 불티관통시험 등 주요 항목을 심사하고 성능인증을 발급합니다."
                link="https://www.kfi.or.kr"
                linkLabel="kfi.or.kr"
                items={kfiItems}
                lastUpdated={kfiLastUpdated}
              />

              {/* 소방청 — 정적 */}
              <div className="flex flex-col p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-[#014A99] hover:shadow-md transition-all duration-200">
                <span className="self-start inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-3" style={{ backgroundColor: "#e8f0fb", color: "#014A99" }}>
                  주무부처
                </span>
                <h3 className="text-base font-bold text-gray-900 mb-2">소방청</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-3">
                  건설현장의 화재안전기준 및 방화포 성능인증·제품검사 기술기준 고시를 관장하는 주무부처입니다.
                </p>
                <a
                  href="https://www.nfa.go.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#014A99] hover:underline"
                >
                  nfa.go.kr →
                </a>
              </div>

              {/* 고용노동부 — 정적 */}
              <div className="flex flex-col p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-[#014A99] hover:shadow-md transition-all duration-200">
                <span className="self-start inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-3" style={{ backgroundColor: "#e8f0fb", color: "#014A99" }}>
                  주무부처
                </span>
                <h3 className="text-base font-bold text-gray-900 mb-2">고용노동부</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-3">
                  산업안전보건기준에 관한 규칙을 관장하며, 2025년 3월 개정을 통해 KFI 성능인증 방화포 의무 사용을 규정하였습니다.
                </p>
                <a
                  href="https://www.moel.go.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#014A99] hover:underline"
                >
                  moel.go.kr →
                </a>
              </div>

              {/* 안전보건공단 — 정적 */}
              <div className="flex flex-col p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-[#014A99] hover:shadow-md transition-all duration-200">
                <span className="self-start inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-3" style={{ backgroundColor: "#e8f0fb", color: "#014A99" }}>
                  지원기관
                </span>
                <h3 className="text-base font-bold text-gray-900 mb-2">안전보건공단 (KOSHA)</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-3">
                  건설현장 화재위험작업 안전지침(KOSHA GUIDE)을 발간하고 현장 안전교육을 지원합니다.
                </p>
                <a
                  href="https://www.kosha.or.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#014A99] hover:underline"
                >
                  kosha.or.kr →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 관련 법령 */}
        <section className="py-12 md:py-20" style={{ backgroundColor: "#f8fafd" }}>
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              Laws & Regulations
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">관련 법령</h2>
            <div className="flex flex-col gap-4">
              {KFI_LAWS.map((law, i) => (
                <div key={i} className="flex gap-4 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <div
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: "#014A99" }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm mb-1">{law.title}</p>
                    <p className="text-gray-500 text-sm leading-relaxed">{law.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 성능인증 조회 방법 */}
        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              How To Check
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">성능인증 현황 조회 방법</h2>
            <p className="text-gray-500 text-sm mb-8">
              현장 반입 전 반드시 KFI 홈페이지에서 해당 제품의 성능인증 유효 여부를 확인하세요.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {howToCheck.map((item) => (
                <div key={item.step} className="p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <p
                    className="text-3xl font-black mb-3"
                    style={{ color: "#e8f0fb", WebkitTextStroke: "1px #014A99" }}
                  >
                    {item.step}
                  </p>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">{item.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div
              className="mt-10 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5"
              style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)" }}
            >
              <div className="text-center sm:text-left">
                <p className="text-white font-bold text-lg sm:text-xl">방화포 견적·기술 문의</p>
                <p className="text-white opacity-75 text-sm mt-1">담당자 확인 후 신속히 회신 드리겠습니다.</p>
              </div>
              <a
                href="/contact"
                className="w-full sm:w-auto text-center shrink-0 px-8 py-3 rounded-md font-semibold text-[#014A99] bg-white hover:bg-[#f0f5fb] transition-colors text-sm"
              >
                문의하기 →
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
