import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ImageLightbox from "@/components/ImageLightbox";

const products = [
  {
    name: "SUS 고정앙카",
    image: "/고정앙카_sus_고정앙카.png",
    specs: [
      { label: "생산규격", value: "SUS 20A ~ 80A" },
      { label: "SUS 100A", value: "사각판넬형으로 생산가능" },
    ],
    features: [
      "고정앙카소켓은 현장 사급받아 용접원클램프만 별도 판매가능",
      "현장조건에 맞게 제작 및 시공이 가능함",
    ],
  },
  {
    name: "앙카볼트",
    image: "/고정앙카_앙카볼트.png",
    specs: [
      { label: "적용범위", value: "관통슬리브 75A ~ 200A" },
    ],
    features: [
      "세트앙카 시공을 위하여 바닥에 타공을 하지 않고 관통슬리브에 미리 고정앙카 인서트를 설치하여 시공하면 앙카체결 작업이 신속함",
      "협소한 공간에 작업 용이함",
      "관통슬리브 75A~200A까지 체결하여 사용함",
    ],
  },
];

export default function AnchorPage() {
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
            <h1 className="text-3xl md:text-5xl font-bold">고정앙카</h1>
            <p className="mt-4 opacity-80 text-sm md:text-base">Fixing Anchor</p>
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
