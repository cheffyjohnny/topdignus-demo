import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ImageLightbox from "@/components/ImageLightbox";

const products = [
  {
    name: "볼트형 관통슬리브",
    image: "/기타_제품_볼트형_관통슬리브.png",
    specs: [
      { label: "75A", value: "높이 150H / 180H / 200H / 210H / 250H" },
      { label: "100A", value: "높이 150H / 180H / 200H / 210H / 250H" },
      { label: "125A", value: "높이 150H / 180H / 200H / 210H / 250H" },
      { label: "150A", value: "높이 150H / 180H / 200H / 210H / 250H" },
      { label: "200A", value: "높이 150H / 180H / 200H / 210H / 250H" },
      { label: "가락지", value: "20 / 30 / 50" },
    ],
    features: [
      "발주예시: 슬리브규격 × 슬리브높이",
      "75A × 150H (관통슬리브 75A용, 높이 150mm)",
      "125A × 210H (관통슬리브 125A용, 높이 210mm)",
    ],
  },
  {
    name: "차열재",
    image: "/기타_제품_차열재.png",
    specs: [
      { label: "제품두께", value: "13mm / 25mm / 38mm / 50mm" },
      { label: "폭", value: "200 / 300 / 400 / 600" },
      { label: "길이", value: "7.2M / 4.8M / 3.6M" },
    ],
    features: [
      "방화구획내의 금속관과 덕트의 인면에 설치되며 화재시 차열효과가 탁월하여 화재 확산을 방지하는 제품",
      "초고온 1000~1300°C에서도 단열성이 우수함",
      "금속관 내화충전구조 2시간 180도 이하 유지",
    ],
  },
  {
    name: "방화실란트",
    image: "/기타_제품_방화실란트.png",
    specs: [
      { label: "제품명", value: "CP606" },
    ],
    features: [
      "설비관통부의 마감재로 사용되며 방화 및 방수 목적",
      "케이블, 배관 덕트의 방화구획 관통부 밀폐를 위한 마감재",
    ],
  },
];

export default function OthersPage() {
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
            <h1 className="text-3xl md:text-5xl font-bold">기타 제품</h1>
            <p className="mt-4 opacity-80 text-sm md:text-base">Other Products</p>
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
