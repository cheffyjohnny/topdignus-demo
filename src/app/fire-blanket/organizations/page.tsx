import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ExpandableOrgCard, { OrgCrawlItem } from "@/components/ExpandableOrgCard";
import { supabaseServer } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "KFI Fire Blanket Certification Body | Topdignus",
  description: "Check the Korea Fire Institute (KFI)'s fire blanket performance certification status in real time. Includes related laws and how to look up certifications.",
  keywords: "fire blanket performance certification, KFI, Korea Fire Institute, National Fire Agency, occupational safety and health standards, fire blanket regulatory bodies",
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
    title: "Fire Safety Standards for Construction Sites (National Fire Agency Notice, effective 2023.7.1)",
    desc: "The National Fire Agency established fire blanket provisions within the fire safety standards for construction sites, specifying the obligation to install fire blankets in fire-risk work zones.",
  },
  {
    title: "Amendment to Occupational Safety and Health Standards Rules (Ministry of Employment and Labor, effective 2025.3.2)",
    desc: "The use of certified fire blankets became legally mandatory. Products based on the previous KOSHA GUIDE (Korea Occupational Safety and Health Agency technical guideline) are no longer recognized.",
  },
  {
    title: "Technical Standards for Fire Blanket Performance Certification and Product Inspection (National Fire Agency Notice)",
    desc: "Detailed technical standards for applying for, reviewing, issuing, and inspecting fire blanket certification. Products must have inspection pass markers (stickers) attached every 3m.",
  },
];

const howToCheck = [
  {
    step: "01",
    title: "Go to the KFI Website",
    desc: "Search for '한국소방산업기술원' (Korea Fire Institute) and go to the official site (kfi.or.kr).",
  },
  {
    step: "02",
    title: "Performance Certification & Product Inspection Menu",
    desc: "Click '성능인증·제품검사' (Performance Certification & Product Inspection) in the main menu.",
  },
  {
    step: "03",
    title: "Select Open Data",
    desc: "In the '공개데이터' (Open Data) menu, select '방화포 승인정보' (Fire Blanket Approval Info).",
  },
  {
    step: "04",
    title: "Verify Certification Info",
    desc: "Check the manufacturer, approval number, model, and approval date, and cross-check against the certification marker on the product brought on site.",
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
            <h1 className="text-3xl md:text-5xl font-bold">Organizations & Related Information</h1>
          </div>
        </section>

        {/* Related Organizations */}
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
              {/* KFI — expandable */}
              <ExpandableOrgCard
                role="Certification Body"
                name="Korea Fire Institute (KFI)"
                desc="The organization designated by the National Fire Agency to handle fire blanket performance certification. Reviews key criteria such as the Spark Penetration Test and issues performance certifications."
                link="https://www.kfi.or.kr"
                linkLabel="kfi.or.kr"
                items={kfiItems}
                lastUpdated={kfiLastUpdated}
              />

              {/* National Fire Agency — static */}
              <div className="flex flex-col p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-[#014A99] hover:shadow-md transition-all duration-200">
                <span className="self-start inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-3" style={{ backgroundColor: "#e8f0fb", color: "#014A99" }}>
                  Governing Agency
                </span>
                <h3 className="text-base font-bold text-gray-900 mb-2">National Fire Agency</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-3">
                  The governing agency overseeing fire safety standards for construction sites and the notices on fire blanket performance certification and product inspection technical standards.
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

              {/* Ministry of Employment and Labor — static */}
              <div className="flex flex-col p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-[#014A99] hover:shadow-md transition-all duration-200">
                <span className="self-start inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-3" style={{ backgroundColor: "#e8f0fb", color: "#014A99" }}>
                  Governing Agency
                </span>
                <h3 className="text-base font-bold text-gray-900 mb-2">Ministry of Employment and Labor</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-3">
                  Oversees the Occupational Safety and Health Standards Rules, which mandated the use of KFI-certified fire blankets through the March 2025 amendment.
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

              {/* KOSHA — static */}
              <div className="flex flex-col p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-[#014A99] hover:shadow-md transition-all duration-200">
                <span className="self-start inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-3" style={{ backgroundColor: "#e8f0fb", color: "#014A99" }}>
                  Support Agency
                </span>
                <h3 className="text-base font-bold text-gray-900 mb-2">Korea Occupational Safety and Health Agency (KOSHA)</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-3">
                  Publishes safety guidelines (KOSHA GUIDE) for fire-risk work at construction sites and supports on-site safety training.
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

        {/* Related Laws */}
        <section className="py-12 md:py-20" style={{ backgroundColor: "#f8fafd" }}>
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              Laws & Regulations
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Related Laws</h2>
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

        {/* How to Check Certification */}
        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              How To Check
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">How to Check Certification Status</h2>
            <p className="text-gray-500 text-sm mb-8">
              Before bringing a product on site, always verify on the KFI website whether it holds valid certification.
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
                <p className="text-white font-bold text-lg sm:text-xl">Get a Fire Blanket Quote or Technical Consultation</p>
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
