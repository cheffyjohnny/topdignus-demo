import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Contact from "@/components/Contact";

export const metadata: Metadata = {
  title: "Contact Us | Topdignus - Fire-Resistant Filling Specialist",
  description: "Product inquiries and quote requests for fire-resistant filling. Contact Topdignus for anything related to rectangular duct or pipe fire-resistant filling.",
  keywords: "fire-resistant filling inquiry, fire-resistant filling quote, Topdignus contact, fire compartment inquiry",
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main>
        <section
          className="py-16 text-white"
          style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)" }}
        >
          <div className="max-w-[980px] mx-auto px-6">
            <p className="text-sm uppercase tracking-widest opacity-70 mb-2">Contact Us</p>
            <h1 className="text-3xl md:text-5xl font-bold">Contact Us</h1>
            <p className="mt-4 opacity-80 text-sm md:text-base">Feel free to reach out anytime.</p>
          </div>
        </section>

        <Contact />
      </main>
      <Footer />
    </>
  );
}
