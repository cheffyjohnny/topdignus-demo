import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ImageLightbox from "@/components/ImageLightbox";

const products = [
  {
    name: "폼패드형",
    image: "/내화충전재_폼패드형.png",
    specs: [
      { label: "[YJ-05] 강관", value: "15A ~ 200A" },
      { label: "[YJ-08] PVC", value: "20A ~ 150A" },
    ],
    features: [
      "분리형 고정틀 구조에 사용되며 내화충전재와 폼을 결합한 제품으로 틈새 간격을 밀실하게 시공이 가능함",
    ],
  },
  {
    name: "패드고리형",
    image: "/내화충전재_패드고리형.png",
    specs: [
      { label: "[YJ-05] 강관", value: "15A ~ 400A" },
      { label: "[YJ-08] PVC", value: "20A ~ 250A" },
    ],
    features: [
      "분리형 고정틀 구조에 사용되며 내화충전재와 고리를 결합한 제품",
      "충전재 발포시 고리가 안전하게 지지함",
    ],
  },
  {
    name: "SU 60A 이하제품",
    image: "/내화충전재_SU_60A_이하.png",
    specs: [
      { label: "SU 20 ~ 25A", value: "세라크울 38T * 100H * 170L" },
      { label: "SU 30 ~ 40A", value: "세라크울 38T * 100H * 230L" },
      { label: "SU 50 ~ 60A", value: "세라크울 38T * 100H * 300L" },
    ],
    features: [
      "대구경 성적서를 사용하지 않고 소구경용 내화충전구조를 인증받아서 시공이 간편하여 자재비가 절감됨",
    ],
  },
];

export default function FireFillerPage() {
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
            <h1 className="text-3xl md:text-5xl font-bold">내화충전재</h1>
            <p className="mt-4 opacity-80 text-sm md:text-base">Fire Filler (방화인증제품)</p>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-6 flex flex-col gap-16">
            <a href="/products/pipe/yj" className="text-sm font-medium text-gray-500 hover:text-black transition-colors flex items-center gap-1 w-fit -mt-8">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              제품 목록
            </a>

            {products.map((product, index) => (
              <div key={index}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">{product.name}</h2>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex-1">
                    {product.specs.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">규격</p>
                        <table className="text-sm text-gray-600 border-collapse">
                          <tbody>
                            {product.specs.map((spec, i) => (
                              <tr key={i}>
                                <td className="pr-6 py-1 font-medium text-gray-700">{spec.label}</td>
                                <td className="py-1">{spec.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {product.features.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">특징</p>
                        <ul className="flex flex-col gap-1">
                          {product.features.map((f, i) => (
                            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#014A99] shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {product.image && (
                    <div className="md:w-[374px] shrink-0">
                      <ImageLightbox src={product.image} alt={product.name} className="w-full rounded-xl border border-gray-100" />
                    </div>
                  )}
                </div>

                {index < products.length - 1 && <div className="mt-12 border-t border-gray-100" />}
              </div>
            ))}

            <a
              href="/contact"
              className="inline-block text-sm font-semibold px-6 py-2.5 rounded-md text-white transition-colors w-fit hover:bg-[#5889BC]"
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
