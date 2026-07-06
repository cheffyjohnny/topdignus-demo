import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "회사소개 | 탑디뉴스 - 내화채움구조 전문기업",
  description: "탑디뉴스는 사각덕트 및 배관 내화채움구조 전문기업입니다. 현장 중심의 맞춤형 내화 솔루션으로 건축물 방화구획의 안전성을 높입니다.",
  keywords: "탑디뉴스 소개, 내화채움구조 전문기업, 방화구획 전문, 내화솔루션 회사",
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
              회사소개
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
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">정답은 현장에 있다</h2>
              <div className="w-10 h-0.5 mb-6" style={{ backgroundColor: "#014A99" }} />
              <p className="text-gray-600 leading-relaxed ">
                저희는 지속적으로 현장과의 소통을 중심으로 내화채움구조(사각덕트, 배관)를 취급하는
                <strong className="text-gray-800"> 탑디뉴스</strong>입니다.
              </p>
              <p className="text-gray-600 leading-relaxed  mt-3">
                안전한 건축 환경을 위해 최선을 다합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: "현장 중심", desc: "고객의 현장 환경을 최우선으로 생각하며 맞춤형 솔루션을 제공합니다." },
                { title: "전문성", desc: "내화채움구조 분야의 전문 지식과 경험을 바탕으로 신뢰할 수 있는 제품을 납품합니다." },
                { title: "안전", desc: "건축물 방화구획의 안전성을 높이는 고성능 내화 솔루션을 공급합니다." },
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
