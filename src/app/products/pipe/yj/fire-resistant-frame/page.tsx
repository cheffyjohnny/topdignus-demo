import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ImageLightbox from "@/components/ImageLightbox";

const products = [
  {
    name: "전착도장 [원터치형]",
    image: "/내화일체형_고정틀_원터치형.png",
    specs: [
      { label: "PVC용", value: "PVC 50A ~ 150A" },
      { label: "소화용", value: "강관 25A ~ 100A" },
      { label: "급수용", value: "강관 SU 25A ~ 100A" },
      { label: "살림/가스/전기용", value: "강관 20A ~ 100A" },
    ],
    features: [
      "방화구획을 관통하는 배관 및 부재에 설치하여 내·외 내화성 강화",
      "사용 중 드래프트 화재 및 후에도 배관을 방화 단열하여 드래프트를 차단합니다",
      "고품질의 내화채움 일체형으로 완성도 높은 설치가 간편합니다",
    ],
  },
  {
    name: "전착도장 원터치형 고정틀의 구조",
    image: "/내화일체형_고정틀_고정틀의_구조.png",
    specs: [],
    features: [],
  },
  {
    name: "스틸 일반형",
    image: "/내화일체형_고정틀_스틸_일반형.png",
    specs: [
      { label: "PVC용", value: "PVC 50A ~ 150A" },
      { label: "소화용", value: "강관 25A ~ 100A" },
    ],
    features: [
      "전기전도 전위 차이로 인한 부식 방지",
      "고품질의 내화채움 일체형으로 완성도 높은 설치",
    ],
  },
  {
    name: "ABS",
    image: "/내화일체형_고정틀_abs.png",
    specs: [
      { label: "[플랜지형] PVC", value: "50A, 75A ~ 150A" },
      { label: "[일반형] PVC", value: "50A, 75A ~ 150A" },
    ],
    features: [
      "난연성 재질로 다양한 환경에서도 사용 가능",
      "소비적 설치작업 가능",
      "금속구조로 전착한 특성의 환경에서 사용하는 곳에 간편합니다",
    ],
  },
];

export default function FireResistantFramePage() {
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
            <h1 className="text-3xl md:text-5xl font-bold">내화일체형 고정틀</h1>
            <p className="mt-4 opacity-80 text-sm md:text-base">Fire Resistant Integrated Fixing Frame</p>
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
                    <div className="md:w-[486px] shrink-0">
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
