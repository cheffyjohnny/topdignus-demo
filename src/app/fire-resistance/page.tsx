import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "What is Fire-Resistant Filling? | Topdignus",
  description: "Learn about the concept, legal basis, types, and major domestic manufacturers of fire-resistant filling.",
  keywords: "fire-resistant filling, fire compartment penetration, fire-stopping, fire-resistant filling manufacturers, performance certification",
};

const types = [
  {
    title: "Pipe Penetrations",
    desc: "Fire-resistant filling applied where water supply, drainage, or fire suppression pipes penetrate fire compartments. Products are selected by material — metal pipe, synthetic resin pipe, etc.",
  },
  {
    title: "Duct Penetrations",
    desc: "Fire-resistant filling applied where HVAC and ventilation ducts penetrate fire compartments. Installed according to the size and shape of rectangular and circular ducts.",
  },
  {
    title: "Cable & Wire Penetrations",
    desc: "Applied where bundled cables, such as power and communication lines, penetrate together. Divided into filler types (sealant, mortar, etc.) and block types.",
  },
  {
    title: "Mixed Penetrations",
    desc: "When multiple types of penetrations, such as pipes and cables, are mixed together, a composite fire-resistant filling system is applied and installed per its individual performance certification.",
  },
];

const manufacturers = [
  {
    name: "Phillip Industries",
    categories: ["Pipe", "Rectangular Duct"],
    note: "Good products made by good people and a good company. Holds quality certification for fire-resistant filling of pipe and rectangular duct penetrations.",
  },
  {
    name: "ProFire",
    categories: ["Rectangular Duct"],
    note: "A specialist manufacturer holding quality certification for fire-resistant filling of rectangular duct penetrations.",
  },
  {
    name: "KingsAsia",
    categories: ["Rectangular Duct"],
    note: "A specialist in Kingspan phenolic ducts and inter-floor fire protection. Holds quality certification for fire-resistant filling of rectangular duct penetrations.",
  },
  {
    name: "Safe Korea",
    categories: ["Pipe", "Rectangular Duct"],
    note: "Founded in 2001, the first company in Korea to obtain fire-resistant filling certification. The hidden firefighter in your home, stopping the spread of fire.",
  },
  {
    name: "YJ Tech",
    categories: ["Pipe"],
    note: "A specialist in fixing clamps and fire-resistant filler materials, holding patented technology and registered designs through continuous R&D. Its integrated fixing frame enables simple installation and reduced labor costs.",
  },
  {
    name: "Agni Korea",
    categories: ["Pipe", "Rectangular Duct"],
    note: "Pursuing change and challenge grounded in technological leadership, aiming to become a one-of-a-kind fire-resistant filling company.",
  },
  {
    name: "EZONE",
    categories: ["Rectangular Duct"],
    note: "A specialist in R&D of new materials and technologies for fire-spread prevention in buildings, with core technology transferred from the Korea Institute of Civil Engineering and Building Technology (KICT).",
  },
  {
    name: "P&I",
    categories: ["Pipe"],
    note: "A fire-stopping specialist continuously researching and developing solutions so people can enjoy an optimal living environment in buildings.",
  },
  {
    name: "Magachem",
    categories: ["Pipe", "Rectangular Duct"],
    note: "Working to protect the safety and property of the public. A specialist manufacturer of fire-resistant filler materials.",
  },
  {
    name: "Unet Korea",
    categories: ["Pipe"],
    note: "A specialist in fire-stopping systems for facility penetrations, providing total solutions for pipe penetrations including fire-resistant fillers, fire sleeves, and integrated clamps.",
  },
  {
    name: "Hue Greentech",
    categories: ["Pipe"],
    note: "Holds a patent for pipe sleeves with built-in fire-resistant filler. A specialist manufacturer of fire-resistant filling for pipe penetrations.",
  },
];

const categoryColors: Record<string, string> = {
  "Pipe": "bg-blue-100 text-blue-700",
  "Rectangular Duct": "bg-orange-100 text-orange-700",
};

export default function FireResistancePage() {
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
            <p className="text-sm uppercase tracking-widest opacity-70 mb-2">Firestopping System</p>
            <h1 className="text-3xl md:text-5xl font-bold">What is Fire-Resistant Filling?</h1>
          </div>
        </section>

        {/* Overview */}
        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              Overview
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Overview of Fire-Resistant Filling</h2>
            <div className="w-10 h-0.5 mb-6" style={{ backgroundColor: "#014A99" }} />
            <p className="text-gray-600 leading-relaxed">
              <strong className="text-gray-800">Fire-resistant filling</strong> is a fire-stopping system that prevents flame, smoke, and harmful gases from
              spreading through penetrations — such as pipes, ducts, and cables — that pass through a building&apos;s fire compartments.
            </p>
            <p className="text-gray-600 leading-relaxed mt-3">
              In the event of a fire, it maintains smoke- and heat-blocking performance at the penetration for a set period (1–3 hours),
              buying crucial time for evacuation and initial firefighting.
            </p>

            {/* Legal basis */}
            <div className="mt-10 p-4 sm:p-6 rounded-2xl border-l-4 border-[#014A99] bg-[#f0f5fb]">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Legal Basis</h3>
              <ul className="text-gray-600 text-sm leading-relaxed space-y-3">
                <li>
                  <span className="font-medium text-gray-800">Building Act Enforcement Decree Article 46 (Installation of Fire Compartments, etc.)</span> —
                  Penetrations of pipes, ducts, cables, etc. through fire compartments must use fire-resistant filling recognized by the Minister of Land, Infrastructure and Transport.
                </li>
                <li>
                  <span className="font-medium text-gray-800">Building Act Article 52-5 (Quality Certification of Building Materials, etc.)</span> —
                  Major building materials, including fire-resistant filling, may only use quality-certified products.
                  This evaluates the entire manufacturing and quality management system, not just performance test results.
                </li>
                <li>
                  <span className="font-medium text-gray-800">Building Act Article 52-6 (Designation and Operation of Quality Certification Bodies)</span> —
                  Newly established by the December 2020 amendment to the Building Act, providing the legal basis for designating and operating quality certification bodies.
                </li>
                <li>
                  <span className="font-medium text-gray-800">Quality Certification and Management Standards for Building Materials (MOLIT Notice)</span> —
                  Defines the detailed procedures for applying for, reviewing, issuing, and following up on quality certification.
                </li>
                <li>
                  <span className="font-medium text-gray-800">Rules on Standards for Building Evacuation and Fire-Protection Structures</span> —
                  Defines fire-resistant filling installation methods and the obligation to submit quality control documentation.
                </li>
              </ul>
              <div className="mt-4 pt-4 border-t border-[#c8d9ee]">
                <p className="text-xs text-gray-500 leading-relaxed">
                  <span className="font-medium text-gray-700">Quality Certification System Transition (effective 2021.12.23)</span> —
                  Transitioned from the previous test-report-centered &quot;performance certification&quot; to a &quot;quality certification&quot; system that includes manufacturing and quality management systems.
                  This was introduced as part of the government&apos;s fire safety measures to prevent a recurrence of the major construction-site fires of 2020.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Types */}
        <section className="py-12 md:py-20" style={{ backgroundColor: "#f8fafd" }}>
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              Types
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Penetration Types</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {types.map((item) => (
                <div key={item.title} className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <h3 className="text-base font-bold mb-2" style={{ color: "#014A99" }}>{item.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Manufacturers */}
        <section id="manufacturers" className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              Manufacturers
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Major Domestic Manufacturers</h2>
            <p className="text-gray-500 text-sm mb-8">
              The manufacturers below are fire-resistant filling specialists holding performance certification from the Ministry of Land, Infrastructure and Transport.
            </p>
            <div className="flex flex-col gap-4">
              {manufacturers.map((m) => (
                <div key={m.name} className="flex flex-col sm:flex-row sm:items-start gap-3 p-5 rounded-2xl border border-gray-100 hover:border-[#014A99] hover:shadow-sm transition-all duration-200">
                  <div className="sm:w-48 shrink-0">
                    <p className="font-bold text-gray-900 text-sm">{m.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {m.categories.map((cat) => (
                        <span key={cat} className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[cat]}`}>
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed">{m.note}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-6">
              * This list is for reference only. Please check the Ministry of Land, Infrastructure and Transport&apos;s building administration system (Seum-teo) for the current certification status.
            </p>

            {/* Contact CTA */}
            <div className="mt-10 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5" style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)" }}>
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
