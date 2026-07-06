import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ExpandableOrgCard, { OrgCrawlItem } from "@/components/ExpandableOrgCard";
import { supabaseServer } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "건기연·KFI 내화채움구조 성능인정 운영기관 | 탑디뉴스",
  description: "한국건설기술연구원(건기연)·한국소방산업기술원(KFI)의 내화채움구조·방화포 성능인정 현황을 실시간으로 확인하세요. 관련 법령 개정 이력과 인정 조회 방법도 함께 안내합니다.",
  keywords: "내화채움구조 성능인정, 건기연, 한국건설기술연구원, KFI, 한국소방산업기술원, 방화포, 건축행정시스템, 세움터, 내화채움 관련기관",
};

async function fetchCrawlData(source: string, limit: number): Promise<OrgCrawlItem[]> {
  const { data, error } = await supabaseServer
    .from("crawl_items")
    .select("title, announced_at, source_url, type")
    .eq("source", source)
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

const howToCheck = [
  {
    step: "01",
    title: "한국건설기술연구원 검색",
    desc: "검색 사이트에서 '한국건설기술연구원'을 검색하여 공식 사이트(kict.re.kr)에 접속합니다.",
  },
  {
    step: "02",
    title: "정보공개 클릭",
    desc: "메인 메뉴에서 '정보공개'를 클릭합니다.",
  },
  {
    step: "03",
    title: "사전정보공표 메뉴 선택",
    desc: "'사전정보공표 - 건설품질 인/지정' 항목을 클릭합니다.",
  },
  {
    step: "04",
    title: "내화채움구조 항목 확인",
    desc: "'인정/인증 전체 현황'에서 전기·소방·통신 분류의 '내화채움구조' 항목을 클릭하면 인정업체 현황을 확인할 수 있습니다.",
  },
];

// Laws with matching crawl source names for last-update lookup
// crawlTitle must match the stored title exactly after stripping "[법령개정] " prefix
const LAWS = [
  {
    title: "건축법 시행령 제46조 (방화구획 등의 설치)",
    desc: "방화구획을 관통하는 배관·덕트·케이블 등의 관통부에 품질인정을 받은 내화채움구조를 의무 적용하도록 규정합니다.",
    crawlTitle: "건축법 시행령",
  },
  {
    title: "건축법 제52조의5 (건축자재 등의 품질인정)",
    desc: "내화채움구조를 포함한 주요 건축자재에 품질인정 의무를 부여합니다. 단순 성능시험이 아닌 제조·품질관리체계 전반을 평가합니다.",
    crawlTitle: "건축법",
  },
  {
    title: "건축법 제52조의6 (품질인정기관의 지정·운영)",
    desc: "2020년 12월 건축법 개정으로 신설된 조항. 품질인정기관 지정 및 운영 근거를 마련하였으며, 이를 통해 2021년 12월 23일부터 품질인정제도가 시행되었습니다.",
    crawlTitle: "건축법",
  },
  {
    title: "건축자재등 품질인정 및 관리기준 (국토교통부 고시)",
    desc: "품질인정 신청·심사·발급·사후관리의 세부 절차를 규정하는 고시. 기존 성능인정 기준을 대체합니다.",
    crawlTitle: "건축자재등 품질인정 및 관리기준",
  },
  {
    title: "건축물의 피난·방화구조 등의 기준에 관한 규칙",
    desc: "내화채움구조 시공 방법 및 품질관리서 제출 의무를 규정합니다. 시공 시 해당 규칙에 따른 서류 제출이 필요합니다.",
    crawlTitle: "건축물의 피난ㆍ방화구조 등의 기준에 관한 규칙",
  },
];

export default async function OrganizationsPage() {
  const [kictItems, lawItems] = await Promise.all([
    fetchCrawlData("kict", 5),
    fetchCrawlData("law", 20),
  ]);

  const kictLastUpdated = getLastUpdated(kictItems);

  // Match law crawl items to static law entries
  // Strips "[법령개정] " prefix before comparing
  function getLawDate(crawlTitle: string): string | null {
    const match = lawItems.find((item) => {
      const cleanTitle = item.title?.replace(/^\[.*?\]\s*/, "") ?? "";
      return cleanTitle === crawlTitle;
    });
    return match?.announced_at ?? null;
  }

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

        {/* 운영기관 */}
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
              {/* KFI — 당분간 숨김 */}

              {/* KICT — expandable */}
              <ExpandableOrgCard
                role="성능인정기관"
                name="한국건설기술연구원 (KICT)"
                desc="국토교통부 지정 내화채움구조 성능인정 전담기관. 제조사의 성능인정 신청 접수·심사·발급을 담당합니다."
                link="https://www.kict.re.kr"
                linkLabel="kict.re.kr"
                items={kictItems}
                lastUpdated={kictLastUpdated}
              />

              {/* 내화채움구조협회 — 정적 */}
              <div className="flex flex-col p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-[#014A99] hover:shadow-md transition-all duration-200">
                <span className="self-start inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-3" style={{ backgroundColor: "#e8f0fb", color: "#014A99" }}>
                  업계 협회
                </span>
                <h3 className="text-base font-bold text-gray-900 mb-2">내화채움구조협회</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-3">
                  내화채움구조 제조사·시공사·관련 전문가로 구성된 업계 협회. 품질인정 기준 문의, 시공 가이드, 업계 동향 정보를 제공합니다.
                </p>
                <a
                  href="http://firestop.or.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#014A99] hover:underline"
                >
                  firestop.or.kr →
                </a>
              </div>

              {/* 국토교통부 — 정적 */}
              <div className="flex flex-col p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-[#014A99] hover:shadow-md transition-all duration-200">
                <span className="self-start inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-3" style={{ backgroundColor: "#e8f0fb", color: "#014A99" }}>
                  주무부처
                </span>
                <h3 className="text-base font-bold text-gray-900 mb-2">국토교통부</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-3">
                  건축법령 및 방화구획 관련 고시를 관장합니다. 내화채움구조 성능기준 및 인정 제도의 최상위 운영 기관입니다.
                </p>
                <a
                  href="https://www.molit.go.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#014A99] hover:underline"
                >
                  molit.go.kr →
                </a>
              </div>

              {/* KCDL — 정적 */}
              <div className="flex flex-col p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-[#014A99] hover:shadow-md transition-all duration-200">
                <span className="self-start inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-3" style={{ backgroundColor: "#e8f0fb", color: "#014A99" }}>
                  성능시험기관
                </span>
                <h3 className="text-base font-bold text-gray-900 mb-2">한국건설방재시험연구원 (KCDL)</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-3">
                  내화채움구조 화재안전 성능시험을 수행하는 공인 시험기관. 제조사는 품질인정 취득 전 이 기관에서 성능시험을 받습니다.
                </p>
                <a
                  href="https://www.kcdl.re.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#014A99] hover:underline"
                >
                  kcdl.re.kr →
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
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">관련 법령</h2>
            {lawItems.length > 0 && (
              <p className="text-gray-500 text-sm mb-8">
                법제처 Open API 기준 — 최근 수집:{" "}
                <span className="font-medium text-gray-700">
                  {formatDateShort(getLastUpdated(lawItems))}
                </span>
              </p>
            )}
            {lawItems.length === 0 && (
              <p className="text-gray-500 text-sm mb-8">관련 법령 정보를 불러오는 중입니다.</p>
            )}
            <div className="flex flex-col gap-4">
              {LAWS.map((law, i) => {
                const revisionDate = getLawDate(law.crawlTitle);
                return (
                  <div key={i} className="flex gap-4 p-5 rounded-2xl bg-white border border-gray-100">
                    <div
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: "#014A99" }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <p className="font-semibold text-gray-800 text-sm mb-1">{law.title}</p>
                        {revisionDate && (
                          <span className="shrink-0 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                            최근 개정 {formatDateShort(revisionDate)}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm leading-relaxed">{law.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 성능인정 조회 방법 */}
        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              How To Check
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">성능인정 현황 조회 방법</h2>
            <p className="text-gray-500 text-sm mb-8">
              시공 전 반드시 한국건설기술연구원 홈페이지에서 해당 제품의 품질인정 보유 여부를 확인하세요.
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

            {/* 문의하기 CTA */}
            <div
              className="mt-10 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5"
              style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)" }}
            >
              <div className="text-center sm:text-left">
                <p className="text-white font-bold text-lg sm:text-xl">내화채움구조 견적·기술 문의</p>
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
