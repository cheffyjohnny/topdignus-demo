const infoCards = [
  {
    tag: "개념 안내",
    title: "내화채움구조란?",
    description: "방화구획 관통부에 화염·연기의 확산을 차단하는 내화충전 시스템입니다. 법적 근거부터 관통부 종류까지 한눈에 확인하세요.",
    href: "/fire-resistance",
    cta: "자세히 보기",
    accent: "#014A99",
  },
  {
    tag: "제조사 정보",
    title: "국내 주요 제조사",
    description: "배관·사각덕트 관통부 내화채움구조 품질인정을 보유한 국내 주요 제조사 목록을 한눈에 확인하세요.",
    href: "/fire-resistance#manufacturers",
    cta: "제조사 보기",
    accent: "#014A99",
  },
  {
    tag: "제도 안내",
    title: "운영기관 및 법령",
    description: "2021년 품질인정제도 전환 이후 달라진 기준, 운영기관, 세움터 조회 방법까지 시공 전 꼭 확인해야 할 정보를 제공합니다.",
    href: "/fire-resistance/organizations",
    cta: "확인하기",
    accent: "#014A99",
  },
];

export default function Products() {
  return (
    <section id="products" className="py-12 md:py-20 bg-white">
      <div className="max-w-[980px] mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="mb-10">
          <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
            What We Do
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">내화채움구조 안내</h2>
          <div className="w-10 h-0.5" style={{ backgroundColor: "#014A99" }} />
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {infoCards.map((card) => (
            <a
              key={card.title}
              href={card.href}
              className="group flex flex-col justify-between p-6 rounded-2xl border border-gray-100 hover:border-[#014A99] hover:shadow-md transition-all duration-200"
            >
              <div>
                <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#e8f0fb] text-[#014A99] mb-4">
                  {card.tag}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{card.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{card.description}</p>
              </div>
              <div className="flex items-center gap-1 mt-6 text-sm font-semibold text-[#014A99] group-hover:gap-2 transition-all">
                <span>{card.cta}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
