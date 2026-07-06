import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const categories = [
  { title: "금속관 벽체 차열", href: "/products/square-duct/kingsasia/metal-wall" },
  { title: "금속관 바닥 차열", href: "/products/square-duct/kingsasia/metal-floor" },
  { title: "비금속관 벽체 차열", href: "/products/square-duct/kingsasia/nonmetal-wall" },
  { title: "비금속관 바닥 차열", href: "/products/square-duct/kingsasia/nonmetal-floor" },
];

export default function KingsasiaPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="py-16 text-white" style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)" }}>
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest opacity-70 mb-2">Products</p>
            <h1 className="text-3xl md:text-5xl font-bold">사각덕트 내화채움</h1>
            <p className="mt-4 opacity-80 text-sm md:text-base">Square Duct Firestopping</p>
          </div>
        </section>

        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <a href="/products/square-duct" className="text-sm font-medium text-gray-500 hover:text-black transition-colors flex items-center gap-1 w-fit mb-10">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              제조사 선택
            </a>

            <div className="inline-block mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">제품 소개</h2>
              <div className="h-0.5 w-full" style={{ backgroundColor: "#014A99" }} />
            </div>
            <p className="text-gray-600 leading-relaxed mb-4">
              덕트가 방화구획을 관통하는 부위에 설치하는 내화채움구조입니다. 금속관 및 비금속관, 벽체 및 바닥
              관통부 모두에 적용 가능하며 국내 기준에 적합한 성능 인증을 보유하고 있습니다.
            </p>
            <p className="text-gray-600 leading-relaxed mb-12">
              화재 발생 시 연기 및 화염의 확산을 효과적으로 차단하여 건축물의 안전을 보장합니다.
            </p>

            <div className="flex flex-col">
              {categories.map((item, index) => (
                <a
                  key={index}
                  href={item.href}
                  className="border-t border-black last:border-b flex items-center justify-between py-4 text-sm font-semibold text-gray-800 hover:text-black transition-colors group"
                >
                  {item.title}
                  <svg
                    className="w-4 h-4 text-black transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>

            <a
              href="/contact"
              className="inline-block mt-12 text-sm font-semibold px-6 py-2.5 rounded-md text-white transition-colors"
              style={{ backgroundColor: "#014A99" }}
            >
              문의하기 →
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
