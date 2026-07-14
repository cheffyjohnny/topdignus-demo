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
            <p className="text-[0.6rem] sm:text-xs md:text-sm tracking-wide">Fire-Resistant Filling Information Portal</p>
          </div>

          {/* Main heading */}
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-3">
            A Guide to Fire-Resistant Filling<br className="sm:hidden" /> for Proper Construction.
          </h1>

          {/* Description */}
          <p className="text-[0.65rem] sm:text-xs md:text-sm lg:text-base opacity-80 w-full mb-6 leading-relaxed max-w-[700px]">
            For construction that meets code, {" "}
            <strong className="font-bold text-white">Topdignus</strong> has organized the concepts, regulations, and certified product information.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-start">
            <a
              href="/fire-resistance"
              className="px-5 py-2 rounded-md font-semibold text-[#014A99] bg-white hover:bg-gray-100 transition-colors text-center text-xs md:text-sm"
            >
              What is Fire-Resistant Filling?
            </a>
            <a
              href="#contact"
              className="px-5 py-2 rounded-md font-semibold text-white border border-white hover:bg-white hover:text-[#014A99] transition-colors text-center text-xs md:text-sm"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
