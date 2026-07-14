const infoCards = [
  {
    tag: "Overview",
    title: "What is Fire-Resistant Filling?",
    description: "A fire-stopping system that blocks the spread of flame and smoke through penetrations in fire compartments. See the legal basis and penetration types at a glance.",
    href: "/fire-resistance",
    cta: "Learn More",
    accent: "#014A99",
  },
  {
    tag: "Manufacturer Info",
    title: "Major Domestic Manufacturers",
    description: "See the major domestic manufacturers holding quality certification for fire-resistant filling of pipe and rectangular duct penetrations at a glance.",
    href: "/fire-resistance#manufacturers",
    cta: "View Manufacturers",
    accent: "#014A99",
  },
  {
    tag: "Regulatory Info",
    title: "Organizations & Regulations",
    description: "Everything you need to check before construction — the standards, organizations, and Seum-teo lookup process that changed after the 2021 quality certification system transition.",
    href: "/fire-resistance/organizations",
    cta: "Check It Out",
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
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">About Fire-Resistant Filling</h2>
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
