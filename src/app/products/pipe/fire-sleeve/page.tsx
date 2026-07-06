import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ImageLightbox from "@/components/ImageLightbox";

const products = [
  {
    name: "방화용 슬리브 (바닥 비금속관 100A 이하)",
    subtitle: "Floor, Non-Metal Pipe ≤100A",
    structureImage: "https://plfd.kr/user/attachment/202505/1748220960809050.jpg",
    specImage: "https://plfd.kr/user/attachment/202505/1747113727603469.jpg",
  },
  {
    name: "방화용 슬리브 (바닥 비금속관 100A 이하) 알폼용·합판용·매립용 섹스티아",
    subtitle: "Floor, Non-Metal Pipe ≤100A — Aluminum Form / Plywood / Concealed",
    structureImage: "https://plfd.kr/user/attachment/202505/1747113727637438.jpg",
    specImage: "https://plfd.kr/user/attachment/202505/1747113727637789.jpg",
  },
  {
    name: "방화용 슬리브 (바닥 비금속관 100A 이하) 노출 발코니 겸용",
    subtitle: "Floor, Non-Metal Pipe ≤100A — Exposed Balcony",
    structureImage: null,
    specImage: "https://plfd.kr/user/attachment/202505/1747113727672024.jpg",
  },
  {
    name: "방화용 슬리브 (바닥 비금속관 단열재용 100A 이하) 기준층·단열재층",
    subtitle: "Floor, Non-Metal Pipe ≤100A — Thermal Insulation Layer",
    structureImage: null,
    specImage: "https://plfd.kr/user/attachment/202505/1747113727706411.jpg",
  },
];

export default function FireSleevePage() {
  return (
    <>
      <Navbar />
      <main>
        <section
          className="py-16 text-white"
          style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)" }}
        >
          <div className="max-w-[980px] mx-auto px-6">
            <p className="text-sm uppercase tracking-widest opacity-70 mb-2">Pipe Firestopping</p>
            <h1 className="text-3xl md:text-5xl font-bold">방화용슬리브</h1>
            <p className="mt-4 opacity-80 text-sm md:text-base">Fire-Resistant Sleeve</p>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-6 flex flex-col gap-20">
            <a href="/products/pipe/phillip" className="text-sm font-medium text-gray-500 hover:text-black transition-colors flex items-center gap-1 w-fit -mt-8">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              배관 내화채움구조
            </a>
            {products.map((product, index) => (
              <div key={index}>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {product.structureImage && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">제품구조</p>
                      <ImageLightbox src={product.structureImage} alt="제품구조" className="w-full rounded-xl border border-gray-100" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">제품사양</p>
                    <ImageLightbox src={product.specImage} alt="제품사양" className="w-full rounded-xl border border-gray-100" />
                  </div>
                </div>
                {index < products.length - 1 && <div className="mt-20 border-t border-gray-100" />}
              </div>
            ))}

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
