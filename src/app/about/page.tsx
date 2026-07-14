import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About Us | Topdignus - Fire-Resistant Filling Specialist",
  description: "Topdignus is a specialist in fire-resistant filling for rectangular ducts and pipes. We enhance the safety of building fire compartments with field-driven, customized fire-resistant solutions.",
  keywords: "Topdignus overview, fire-resistant filling specialist, fire compartment expert, fire-resistant solutions company",
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        <section
          className="py-16 text-white"
          style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)" }}
        >
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest opacity-70 mb-2">About Us</p>
            <h1 className="text-3xl md:text-5xl font-bold">
              Company Overview
              <span className="block text-lg md:text-2xl font-light tracking-[0.25em] opacity-60 mt-2">Topdignus</span>
            </h1>
          </div>
        </section>

        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <div className="mb-16">
              <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
                Who We Are
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">The Answer Lies in the Field</h2>
              <div className="w-10 h-0.5 mb-6" style={{ backgroundColor: "#014A99" }} />
              <p className="text-gray-600 leading-relaxed ">
                We are <strong className="text-gray-800">Topdignus</strong>, a fire-resistant filling (rectangular duct, pipe) company that stays constantly focused on communication with the field.
              </p>
              <p className="text-gray-600 leading-relaxed  mt-3">
                We do our best for a safer built environment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: "Field-Focused", desc: "We prioritize our clients' on-site conditions and provide customized solutions." },
                { title: "Expertise", desc: "We deliver reliable products backed by specialized knowledge and experience in fire-resistant filling." },
                { title: "Safety", desc: "We supply high-performance fire-resistant solutions that enhance the safety of building fire compartments." },
              ].map((item) => (
                <div key={item.title} className="p-6 rounded-2xl" style={{ backgroundColor: "#f0f5fb" }}>
                  <h3 className="text-lg font-bold text-gray-900 mb-3" style={{ color: "#014A99" }}>
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
