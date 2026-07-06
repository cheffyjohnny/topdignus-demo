import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ImageLightbox from "@/components/ImageLightbox";

const products = [
  {
    name: "내화일체형 소켓 (오배수용)",
    image: "/pvc_입상배관_제품_내화일체형_소켓.png",
    specs: [
      { label: "규격", value: "100A / 75A / 50A" },
    ],
    features: [

    ],
    badge: "특허제품",
  },
  {
    name: "내화일체형 배수접속기 (주방 배수용)",
    image: "/pvc_입상배관_제품_내화일체형_배수접속기.png",
    specs: [
      { label: "[너트형/볼트형]", value: "100A / 75A" },
    ],
    features: [
      "내화일체형 소켓으로 냄새, 소음, 연기를 완벽하게 차단함",
      "바닥면 고정과 파이프 결림턱이 PVC파이프를 지지하고 있어서 상부 하중누적으로 인한 처짐 문제를 완전히 해소함",
      "주방 배수 및 화장실 오배수용 배수접속기에 내화충전재를 일체화하여 시공이 편리하여 자재비와 인건비가 월등히 절감",
    ],
    badge: "특허제품",
  },
  {
    name: "섹스티아용",
    image: "/pvc_입상배관_제품_섹스티아용.png",
    specs: [
      { label: "PVC", value: "100 × 125" },
      { label: "고정링", value: "PVC 50A" },
    ],
    features: [],
    badge: null,
  },
  {
    name: "LT관용 롱바디용",
    image: "/pvc_입상배관_제품_LT관용_롱바디용.png",
    specs: [
      { label: "규격", value: "100×50 / 75×50" },
    ],
    features: [],
    badge: null,
  },
];

export default function PvcRiserPipePage() {
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
            <h1 className="text-3xl md:text-5xl font-bold">PVC 입상배관 제품</h1>
            <p className="mt-4 opacity-80 text-sm md:text-base">PVC Riser Pipe Products (신제품)</p>
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
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
                  {product.badge && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white bg-[#014A99]">{product.badge}</span>
                  )}
                </div>

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
