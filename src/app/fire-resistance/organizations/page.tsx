import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ExpandableOrgCard, { OrgCrawlItem } from "@/components/ExpandableOrgCard";
import { supabaseServer } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "KICT & KFI Fire-Resistant Filling Certification Bodies | Topdignus",
  description: "Check the Korea Institute of Civil Engineering and Building Technology (KICT) and Korea Fire Institute (KFI)'s fire-resistant filling and fire blanket certification status in real time. Includes related law revision history and how to look up certifications.",
  keywords: "fire-resistant filling certification, KICT, Korea Institute of Civil Engineering and Building Technology, KFI, Korea Fire Institute, fire blanket, building administration system, Seum-teo, fire-resistant filling related organizations",
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
    title: "Search for KICT",
    desc: "Search for '한국건설기술연구원' (Korea Institute of Civil Engineering and Building Technology) and go to the official site (kict.re.kr).",
  },
  {
    step: "02",
    title: "Click Information Disclosure",
    desc: "Click '정보공개' (Information Disclosure) in the main menu.",
  },
  {
    step: "03",
    title: "Select Pre-Disclosure Menu",
    desc: "Click '사전정보공표 - 건설품질 인/지정' (Pre-Disclosure - Construction Quality Certification/Designation).",
  },
  {
    step: "04",
    title: "Check Fire-Resistant Filling Entry",
    desc: "In '인정/인증 전체 현황' (Full Certification Status), click the '내화채움구조' (Fire-Resistant Filling) entry under the Electrical/Fire/Telecom category to see certified companies.",
  },
];

// Laws with matching crawl source names for last-update lookup
// crawlTitle must match the stored title exactly after stripping "[법령개정] " prefix
const LAWS = [
  {
    title: "Building Act Enforcement Decree Article 46 (Installation of Fire Compartments, etc.)",
    desc: "Requires certified fire-resistant filling to be used at penetrations of pipes, ducts, cables, etc. through fire compartments.",
    crawlTitle: "건축법 시행령", // matching key against crawled law data — must stay Korean
  },
  {
    title: "Building Act Article 52-5 (Quality Certification of Building Materials, etc.)",
    desc: "Requires quality certification for major building materials, including fire-resistant filling. Evaluates the entire manufacturing and quality management system, not just performance tests.",
    crawlTitle: "건축법", // matching key against crawled law data — must stay Korean
  },
  {
    title: "Building Act Article 52-6 (Designation and Operation of Quality Certification Bodies)",
    desc: "A new provision from the December 2020 amendment to the Building Act, providing the legal basis for designating and operating quality certification bodies. The quality certification system took effect on December 23, 2021 as a result.",
    crawlTitle: "건축법", // matching key against crawled law data — must stay Korean
  },
  {
    title: "Quality Certification and Management Standards for Building Materials (MOLIT Notice)",
    desc: "A notice defining the detailed procedures for applying for, reviewing, issuing, and following up on quality certification. Replaces the previous performance certification standards.",
    crawlTitle: "건축자재등 품질인정 및 관리기준", // matching key against crawled law data — must stay Korean
  },
  {
    title: "Rules on Standards for Building Evacuation and Fire-Protection Structures",
    desc: "Defines fire-resistant filling installation methods and the obligation to submit quality control documentation. The corresponding documentation must be submitted during construction.",
    crawlTitle: "건축물의 피난ㆍ방화구조 등의 기준에 관한 규칙", // matching key against crawled law data — must stay Korean
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
            <h1 className="text-3xl md:text-5xl font-bold">Organizations & Related Information</h1>
          </div>
        </section>

        {/* Organizations */}
        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              Organizations
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Related Organizations</h2>
            <p className="text-gray-500 text-sm mb-8">
              Click a card to see the latest collected data for each organization.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* KFI — hidden for now */}

              {/* KICT — expandable */}
              <ExpandableOrgCard
                role="Certification Body"
                name="Korea Institute of Civil Engineering and Building Technology (KICT)"
                desc="The organization designated by MOLIT to handle fire-resistant filling performance certification. Responsible for receiving, reviewing, and issuing manufacturer certification applications."
                link="https://www.kict.re.kr"
                linkLabel="kict.re.kr"
                items={kictItems}
                lastUpdated={kictLastUpdated}
              />

              {/* Fire-Resistant Filling Association — static */}
              <div className="flex flex-col p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-[#014A99] hover:shadow-md transition-all duration-200">
                <span className="self-start inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-3" style={{ backgroundColor: "#e8f0fb", color: "#014A99" }}>
                  Industry Association
                </span>
                <h3 className="text-base font-bold text-gray-900 mb-2">Fire-Resistant Filling Association</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-3">
                  An industry association made up of fire-resistant filling manufacturers, installers, and related experts. Provides guidance on certification standards, installation guides, and industry trends.
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

              {/* Ministry of Land, Infrastructure and Transport — static */}
              <div className="flex flex-col p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-[#014A99] hover:shadow-md transition-all duration-200">
                <span className="self-start inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-3" style={{ backgroundColor: "#e8f0fb", color: "#014A99" }}>
                  Governing Ministry
                </span>
                <h3 className="text-base font-bold text-gray-900 mb-2">Ministry of Land, Infrastructure and Transport</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-3">
                  Oversees building laws and fire compartment-related notices. The top-level body operating fire-resistant filling performance standards and the certification system.
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

              {/* KCDL — static */}
              <div className="flex flex-col p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-[#014A99] hover:shadow-md transition-all duration-200">
                <span className="self-start inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-3" style={{ backgroundColor: "#e8f0fb", color: "#014A99" }}>
                  Performance Testing Body
                </span>
                <h3 className="text-base font-bold text-gray-900 mb-2">Korea Conformity Testing Institute (KCDL)</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-3">
                  An accredited testing body that conducts fire safety performance tests for fire-resistant filling. Manufacturers undergo performance testing here before obtaining quality certification.
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

        {/* Related Laws */}
        <section className="py-12 md:py-20" style={{ backgroundColor: "#f8fafd" }}>
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              Laws & Regulations
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Related Laws</h2>
            {lawItems.length > 0 && (
              <p className="text-gray-500 text-sm mb-8">
                Based on the Korea Law Information Center Open API — last collected:{" "}
                <span className="font-medium text-gray-700">
                  {formatDateShort(getLastUpdated(lawItems))}
                </span>
              </p>
            )}
            {lawItems.length === 0 && (
              <p className="text-gray-500 text-sm mb-8">Loading related law information.</p>
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
                            Last revised {formatDateShort(revisionDate)}
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

        {/* How to Check Certification */}
        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              How To Check
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">How to Check Certification Status</h2>
            <p className="text-gray-500 text-sm mb-8">
              Before construction, always verify on the KICT website whether the product holds quality certification.
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

            {/* Contact CTA */}
            <div
              className="mt-10 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5"
              style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)" }}
            >
              <div className="text-center sm:text-left">
                <p className="text-white font-bold text-lg sm:text-xl">Get a Quote or Technical Consultation</p>
                <p className="text-white opacity-75 text-sm mt-1">Our team will review it and respond promptly.</p>
              </div>
              <a
                href="/contact"
                className="w-full sm:w-auto text-center shrink-0 px-8 py-3 rounded-md font-semibold text-[#014A99] bg-white hover:bg-[#f0f5fb] transition-colors text-sm"
              >
                Contact Us →
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
