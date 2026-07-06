import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Page() {
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
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 border border-blue-100">
         
              <p className="text-sm text-gray-700">신규 인정서 발급 <span className="font-semibold text-[#014A99]">5월 예정</span></p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
