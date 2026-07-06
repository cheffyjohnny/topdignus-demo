export default function Hero() {
  return (
    <section className="relative w-full flex justify-center text-white px-2 sm:px-6">
      <div
        className="w-full max-w-[1536px] flex items-center py-10 sm:py-14 min-h-[32vh] px-4 sm:px-6 mt-[10px] mb-[10px]"
        style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)", borderRadius: "10px" }}
      >
        <div className="w-full max-w-[980px] pl-2 sm:pl-8 md:pl-[50px]">
          {/* Brand subtitle */}
          <div className="mb-4 opacity-80 space-y-1" style={{ color: "#a8c8e8" }}>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold tracking-wide md:tracking-widest">
              <span style={{ color: "#E63946" }}>T</span>op Dignus
            </p>
            <p className="text-[0.6rem] sm:text-xs md:text-sm lg:tracking-widest">
              <span style={{ color: "#E63946" }}>T</span>otal{" "}
              <span style={{ color: "#E63946" }}>O</span>f fire
              <span style={{ color: "#E63946" }}>P</span>roof Material
            </p>
            <p className="text-[0.6rem] sm:text-xs md:text-sm tracking-wide">내화채움구조 정보 포털</p>
          </div>

          {/* Main heading */}
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-3">
            올바른 시공을 위한<br className="sm:hidden" /> 내화채움구조 가이드.
          </h1>

          {/* Description */}
          <p className="text-[0.65rem] sm:text-xs md:text-sm lg:text-base opacity-80 w-full mb-6 leading-relaxed max-w-[700px]">
            기준에 맞는 시공을 위해, 개념·법령·인정 제품 정보를{" "}
            <strong className="font-bold text-white">탑디뉴스</strong>가 정리했습니다.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-start">
            <a
              href="/fire-resistance"
              className="px-5 py-2 rounded-md font-semibold text-[#014A99] bg-white hover:bg-gray-100 transition-colors text-center text-xs md:text-sm"
            >
              내화채움구조란?
            </a>
            <a
              href="#contact"
              className="px-5 py-2 rounded-md font-semibold text-white border border-white hover:bg-white hover:text-[#014A99] transition-colors text-center text-xs md:text-sm"
            >
              문의하기
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
