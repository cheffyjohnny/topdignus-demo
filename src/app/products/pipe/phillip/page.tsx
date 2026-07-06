import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const categories = [
  { title: "일체형벽체슬리브", href: "/products/pipe/integrated-wall-sleeve" },
  { title: "내화채움재", href: "/products/pipe/refractory-filling" },
  { title: "일체형클램프", href: "/products/pipe/integrated-clamp" },
  { title: "방화용슬리브", href: "/products/pipe/fire-sleeve" },
  { title: "오배수 섹스티아", href: "/products/pipe/wastewater-sextia" },
  { title: "조절조인트", href: "/products/pipe/adjustable-joint" },
  { title: "싱크용 섹스티아", href: "/products/pipe/sink-sextia" },
  { title: "층상용 섹스티아", href: "/products/pipe/floor-sextia" },
];

export default function PhillipPipePage() {
  return (
    <>
      <Navbar />
      <main>
        <section
          className="py-16 text-white"
          style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)" }}
        >
          <div className="max-w-[980px] mx-auto px-6">
            <p className="text-sm uppercase tracking-widest opacity-70 mb-2">Products</p>
            <h1 className="text-3xl md:text-5xl font-bold">배관 내화채움구조</h1>
            <p className="mt-4 opacity-80 text-sm md:text-base">Pipe Firestopping System</p>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-6">
            <a href="/products/pipe" className="text-sm font-medium text-gray-500 hover:text-black transition-colors flex items-center gap-1 w-fit mb-10">
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
              배관이 방화구획을 관통하는 부위에 설치하는 내화채움구조입니다. 다양한 배관 종류에 대응 가능하며
              국내 기준에 적합한 성능을 제공합니다.
            </p>
            <p className="text-gray-600 leading-relaxed mb-12">
              화재 발생 시 연기 및 화염의 확산을 효과적으로 차단하여 건축물의 안전을 보장합니다.
            </p>

            {/* Category list */}
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
