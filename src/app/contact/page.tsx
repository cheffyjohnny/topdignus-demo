import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Contact from "@/components/Contact";

export const metadata: Metadata = {
  title: "문의하기 | 탑디뉴스 - 내화채움구조 전문기업",
  description: "내화채움구조 제품 문의 및 견적 요청. 사각덕트, 배관 내화채움 관련 문의는 탑디뉴스로 연락해 주세요.",
  keywords: "내화채움 문의, 내화채움 견적, 탑디뉴스 연락처, 방화구획 문의",
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
            <h1 className="text-3xl md:text-5xl font-bold">문의하기</h1>
            <p className="mt-4 opacity-80 text-sm md:text-base">언제든지 문의해 주세요.</p>
          </div>
        </section>

        <Contact />
      </main>
      <Footer />
    </>
  );
}
