import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "납품실적 | 탑디뉴스 - 내화채움구조 전문기업",
  description: "탑디뉴스의 주요 납품실적. 인천공항, GIST, 국립체육박물관, 한국수출입은행, ASML, 삼성SDI, LG화학 등 공공기관 및 대기업 다수 납품.",
  keywords: "탑디뉴스 납품실적, 내화채움 시공사례, 공공기관 내화채움, 인천공항 내화, ASML 내화채움",
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
            <h1 className="text-3xl md:text-5xl font-bold">납품실적</h1>
          </div>
        </section>

        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {[
                {
                  icon: "🏭",
                  category: "대기업 / 글로벌 기업",
                  items: [
                    "ASML (동탄·화성 뉴캠퍼스)",
                    "삼성SDI (울산공장)",
                    "LG화학 (청주)",
                    "경동나비엔 (서탄공장)",
                    "롯데정밀화학",
                    "도쿄일렉트론 (평택공장)",
                    "신세계 본점",
                    "KT (평택 고덕빌딩)",
                  ],
                },
                {
                  icon: "🏛️",
                  category: "공공기관 / 국가시설",
                  items: [
                    "인천공항 T2 대한항공라운지",
                    "광주과학기술원 (GIST)",
                    "국립체육박물관",
                    "한국수출입은행",
                    "KBS 송신소",
                    "수원지방법원 안산지원",
                    "서울출입국외국인청",
                    "LH (성남)",
                  ],
                },
                {
                  icon: "🏗️",
                  category: "대형 건설 브랜드",
                  items: [
                    "래미안 (잠원)",
                    "GS 자이 (과천·원주)",
                    "롯데캐슬 (검단·부산)",
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
