import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function FireBlanketPage() {
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
            <h1 className="text-3xl md:text-5xl font-bold">방화포</h1>
            <p className="mt-4 opacity-80 text-sm md:text-base">Fire Blanket</p>
          </div>
        </section>

        <section className="py-40 bg-white min-h-[50vh] flex items-center">
          <div className="max-w-[980px] mx-auto px-6 text-center w-full">
            <p className="text-4xl mb-4">🚧</p>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">2026년 5월 출시 예정</h2>
            <p className="text-gray-400 text-sm">방화포 제품은 2026년 5월부터 판매가 시작될 예정입니다. 문의사항은 아래 버튼을 통해 연락해 주세요.</p>
            <a
              href="/contact"
              className="inline-block mt-6 text-sm font-semibold px-6 py-2.5 rounded-md text-white transition-colors hover:bg-[#5889BC]"
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
