import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Track Record | Topdignus - Fire-Resistant Filling Specialist",
  description: "Topdignus's major project track record, including deliveries to public institutions and large enterprises such as Incheon Airport, GIST, the National Sports Museum, the Export-Import Bank of Korea, ASML, Samsung SDI, and LG Chem.",
  keywords: "Topdignus track record, fire-resistant filling case studies, public institution fire-resistant filling, Incheon Airport fire-resistant, ASML fire-resistant filling",
};

export default function ReferencesPage() {
  return (
    <>
      <Navbar />
      <main>
        <section
          className="py-16 text-white"
          style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)" }}
        >
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest opacity-70 mb-2">Project References</p>
            <h1 className="text-3xl md:text-5xl font-bold">Track Record</h1>
          </div>
        </section>

        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {[
                {
                  icon: "🏭",
                  category: "Large & Global Enterprises",
                  items: [
                    "ASML (Dongtan/Hwaseong New Campus)",
                    "Samsung SDI (Ulsan Plant)",
                    "LG Chem (Cheongju)",
                    "Kyungdong Navien (Seotan Plant)",
                    "Lotte Fine Chemical",
                    "Tokyo Electron (Pyeongtaek Plant)",
                    "Shinsegae Main Store",
                    "KT (Pyeongtaek Godeok Building)",
                  ],
                },
                {
                  icon: "🏛️",
                  category: "Public Institutions & Government Facilities",
                  items: [
                    "Incheon Airport T2 Korean Air Lounge",
                    "Gwangju Institute of Science and Technology (GIST)",
                    "National Sports Museum",
                    "Export-Import Bank of Korea",
                    "KBS Transmission Center",
                    "Suwon District Court, Ansan Branch",
                    "Seoul Immigration & Foreigner Office",
                    "LH (Seongnam)",
                  ],
                },
                {
                  icon: "🏗️",
                  category: "Major Construction Brands",
                  items: [
                    "Raemian (Jamwon)",
                    "GS Xi (Gwacheon/Wonju)",
                    "Lotte Castle (Geomdan/Busan)",
                  ],
                },
              ].map((group) => (
                <div key={group.category}>
                  <p className="text-sm font-semibold text-gray-900 mb-4">
                    {group.icon} {group.category}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {group.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#014A99" }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-12">
              <a
                href="/contact"
                className="inline-block text-sm font-semibold px-6 py-2.5 rounded-md text-white transition-colors"
                style={{ backgroundColor: "#014A99" }}
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
