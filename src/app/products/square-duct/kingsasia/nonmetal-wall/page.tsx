import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ImageLightbox from "@/components/ImageLightbox";

export default function NonmetalWallPage() {
  return (
    <>
      <Navbar />
      <main>
        <section
          className="py-16 text-white"
          style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)" }}
        >
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest opacity-70 mb-2">Square Duct Firestopping</p>
            <h1 className="text-3xl md:text-5xl font-bold">비금속관 벽체 차열</h1>
          </div>
        </section>

        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6 flex flex-col gap-12 md:gap-20">
            <a href="/products/square-duct/kingsasia" className="text-sm font-medium text-gray-500 hover:text-black transition-colors flex items-center gap-1 w-fit -mt-8">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              사각덕트 내화채움
            </a>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">비금속관 벽체 차열</h2>
              <ImageLightbox
                src="/킹스아시아_비금속관_PKTWP-2600-650_벽체.png"
                alt="비금속관 벽체 차열"
                className="w-full rounded-xl border border-gray-100"
              />
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
