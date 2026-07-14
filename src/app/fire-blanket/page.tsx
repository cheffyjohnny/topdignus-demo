import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "What is a Fire Blanket? | Topdignus",
  description: "Learn about the concept, legal basis, uses, and KFI performance certification standards for fire blankets — an essential safety item for fire-risk work at construction sites.",
  keywords: "fire blanket, fire blanket performance certification, KFI, Korea Fire Institute, welding spark spread prevention, construction site fire safety",
};

const applications = [
  {
    title: "Arc & Gas Welding Work",
    desc: "High-temperature sparks from metal welding can scatter several meters. Fire blankets are installed around the work area to block spark spread to nearby combustibles.",
  },
  {
    title: "Gas Cutting & Grinding Work",
    desc: "Gas cutters and grinders also generate large amounts of high-temperature sparks. Fire blankets wrap the bottom and sides of the work area to protect combustibles such as flooring and insulation.",
  },
  {
    title: "Fire-Risk Work Zones at Construction Sites",
    desc: "Various welding and cutting operations concentrate during the framing and finishing stages of apartments and buildings. Depending on building size, hundreds to tens of thousands of m² of fire blanket may be needed, and it is easy to move and reinstall on site.",
  },
  {
    title: "Elevated & Confined Work Zones",
    desc: "Fire blankets are mandatory for welding work in areas where evacuation is difficult in the event of a fire, such as high-rise exterior walls, ceiling piping, and narrow mechanical rooms.",
  },
];

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    ),
    title: "High Heat-Resistant Material",
    desc: "Made of ceramic fiber or glass fiber-based materials that keep their shape and do not ignite even under the high heat of welding and cutting sparks.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Spark Penetration Test Certified",
    desc: "Only products that pass the Spark Penetration Test — the core inspection item of KFI performance certification — can be used on site.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    title: "Easy to Move & Reinstall On Site",
    desc: "As a flexible fabric, it can be rolled up for transport. Inspection markers are attached every 3m, making it easy to verify specifications and manage.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: "Compliant with Mandatory Certification",
    desc: "As of March 2, 2025, an amendment to the Occupational Safety and Health Standards Rules made the use of KFI-certified fire blankets legally mandatory.",
  },
];

export default function FireBlanketPage() {
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
            <p className="text-sm uppercase tracking-widest opacity-70 mb-2">Fire Blanket</p>
            <h1 className="text-3xl md:text-5xl font-bold">What is a Fire Blanket?</h1>
          </div>
        </section>

        {/* Overview */}
        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              Overview
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Fire Blanket Overview</h2>
            <div className="w-10 h-0.5 mb-6" style={{ backgroundColor: "#014A99" }} />
            <p className="text-gray-600 leading-relaxed">
              A <strong className="text-gray-800">fire blanket</strong> is a heat-resistant fabric safety item used at construction sites to prevent
              sparks generated during fire-risk work — welding, gas cutting, grinding, etc. — from scattering onto nearby combustibles
              and starting a fire.
            </p>
            <p className="text-gray-600 leading-relaxed mt-3">
              Its purpose differs from fire-resistant filling, which is permanently installed at fire compartment penetrations — a fire blanket is
              temporarily installed during work and removed afterward. Depending on building size and process, hundreds to tens of thousands of m² may be needed.
            </p>
            <p className="text-gray-600 leading-relaxed mt-3">
              In Korea, the Korea Fire Institute (KFI) is responsible for fire blanket performance certification,
              and the use of certified products has been legally mandatory since March 2, 2025.
            </p>

            {/* Legal basis */}
            <div className="mt-10 p-4 sm:p-6 rounded-2xl border-l-4 border-[#014A99] bg-[#f0f5fb]">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Legal Basis & Certification System</h3>
              <ul className="text-gray-600 text-sm leading-relaxed space-y-3">
                <li>
                  <span className="font-medium text-gray-800">Fire Safety Standards for Construction Sites (National Fire Agency Notice, effective 2023.7.1)</span> —
                  The National Fire Agency established fire blanket provisions within the fire safety standards for construction sites,
                  specifying the obligation to install fire blankets in fire-risk work zones.
                </li>
                <li>
                  <span className="font-medium text-gray-800">Amendment to Occupational Safety and Health Standards Rules (effective 2025.3.2)</span> —
                  The rule requiring the mandatory use of certified fire blankets took full effect.
                  Products based on the previous KOSHA GUIDE (Korea Occupational Safety and Health Agency technical guideline) can no longer be used.
                </li>
                <li>
                  <span className="font-medium text-gray-800">Korea Fire Institute (KFI) Fire Blanket Performance Certification</span> —
                  KFI, as the dedicated certification body, reviews key criteria including the Spark Penetration Test.
                  There are currently 7 manufacturers holding performance certification.
                </li>
                <li>
                  <span className="font-medium text-gray-800">Technical Standards for Fire Blanket Performance Certification and Product Inspection (National Fire Agency Notice)</span> —
                  Defines the detailed technical standards for applying for, reviewing, issuing, and inspecting fire blanket certification.
                  Products must have inspection pass markers (stickers) attached every 3m.
                </li>
              </ul>
              <div className="mt-4 pt-4 border-t border-[#c8d9ee]">
                <p className="text-xs text-gray-500 leading-relaxed">
                  <span className="font-medium text-gray-700">Verifying Certification</span> —
                  Fire blanket certification status can be looked up on the Korea Fire Institute (KFI) official website.
                  Be sure to verify the certification number, manufacturer, product name, and validity period before use.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-12 md:py-20" style={{ backgroundColor: "#f8fafd" }}>
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              Features
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Key Features</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {features.map((f) => (
                <div key={f.title} className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm flex gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#f0f5fb] flex items-center justify-center shrink-0" style={{ color: "#014A99" }}>
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">{f.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Applications */}
        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              Applications
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Key Applications & Work Sites</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {applications.map((item) => (
                <div key={item.title} className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <h3 className="text-base font-bold mb-2" style={{ color: "#014A99" }}>{item.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 md:py-20" style={{ backgroundColor: "#f8fafd" }}>
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <div
              className="rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5"
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
