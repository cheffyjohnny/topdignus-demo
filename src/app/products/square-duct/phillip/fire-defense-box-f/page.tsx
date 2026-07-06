import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ImageLightbox from "@/components/ImageLightbox";

export default function FireDefenseBoxFPage() {
  return (
    <>
      <Navbar />
      <main>
        <section
          className="py-16 text-white"
          style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)" }}
        >
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest opacity-70 mb-2">Duct Firestopping</p>
            <h1 className="text-3xl md:text-5xl font-bold">바닥 차열댐퍼시스템</h1>
            <p className="mt-4 opacity-80 text-sm md:text-base">Fire Defense Box F — Double Blade Damper</p>
          </div>
        </section>

        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6 flex flex-col gap-12 md:gap-20">
            <a href="/products/square-duct/phillip" className="text-sm font-medium text-gray-500 hover:text-black transition-colors flex items-center gap-1 w-fit -mt-8">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              덕트 내화채움구조
            </a>

            <div>
              <h2 className="text-base md:text-xl font-bold text-gray-900 mb-2">금속 바닥 차열댐퍼시스템 (더블 블레이드 댐퍼)</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">제품구조</p>
                  <ImageLightbox
                    src="https://plfd.kr/user/attachment/202505/1748220444153553.jpg"
                    alt="제품구조"
                    className="w-full rounded-xl border border-gray-100"
                  />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">제품사양</p>
                  <ImageLightbox
                    src="https://plfd.kr/user/attachment/202505/1747113727097283.jpg"
                    alt="제품사양"
                    className="w-full rounded-xl border border-gray-100"
                  />
                </div>
              </div>
            </div>

            <a
              href="/contact"
              className="inline-block text-sm font-semibold px-6 py-2.5 rounded-md text-white transition-colors w-fit"
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
