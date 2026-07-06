import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ImageLightbox from "@/components/ImageLightbox";

const products = [
  {
    name: "내화채움재 (벽체 비금속관 150A 이하) 콘크리트·스터드",
    subtitle: "Wall, Non-Metal Pipe ≤150A — Concrete & Stud",
    structureImage: "https://plfd.kr/user/attachment/202505/1748220654008959.jpg",
    specImage: "https://plfd.kr/user/attachment/202505/1747113727381156.jpg",
  },
  {
    name: "내화채움재 (벽체 금속관 비보온 150A 이하) 콘크리트·스터드",
    subtitle: "Wall, Metal Pipe, Uninsulated ≤150A — Concrete & Stud",
    structureImage: "https://plfd.kr/user/attachment/202505/1748220686466678.jpg",
    specImage: "https://plfd.kr/user/attachment/202505/1747113727416629.jpg",
  },
  {
    name: "내화채움재 (벽체 금속관 보온 40T 200A 이하) 콘크리트·스터드",
    subtitle: "Wall, Metal Pipe, Insulated 40T ≤200A — Concrete & Stud",
    structureImage: "https://plfd.kr/user/attachment/202505/1748220705525677.jpg",
    specImage: "https://plfd.kr/user/attachment/202505/1747113727456500.jpg",
  },
  {
    name: "내화채움재 (바닥 금속관 비보온 150A 이하) 콘크리트",
    subtitle: "Floor, Metal Pipe, Uninsulated ≤150A — Concrete",
    structureImage: "https://plfd.kr/user/attachment/202505/1748220727658445.jpg",
    specImage: "https://plfd.kr/user/attachment/202505/1747113727490708.jpg",
  },
  {
    name: "내화채움재 (바닥 비금속관 150A 이하) 콘크리트",
    subtitle: "Floor, Non-Metal Pipe ≤150A — Concrete",
    structureImage: "https://plfd.kr/user/attachment/202505/1748220752812472.jpg",
    specImage: "https://plfd.kr/user/attachment/202505/1747113727524932.jpg",
  },
];

export default function RefractoryFillingPage() {
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
            <h1 className="text-3xl md:text-5xl font-bold">내화채움재</h1>
            <p className="mt-4 opacity-80 text-sm md:text-base">Refractory Filling Material</p>
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
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">제품구조</p>
                    <ImageLightbox src={product.structureImage} alt="제품구조" className="w-full rounded-xl border border-gray-100" />
                  </div>
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
