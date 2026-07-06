const logos = [
  { src: "/logo_phillip.png", alt: "Philip Industry", large: false },
  { src: "/logo_kingsAsia.avif", alt: "Kings Asia", large: false },
  { src: "/logo_pf.png", alt: "PF", large: false },
  { src: "/logo_yj.jpg", alt: "YJ", large: true },
];

const track = [...logos, ...logos, ...logos, ...logos, ...logos, ...logos, ...logos, ...logos];

export default function LogoCarousel() {
  return (
    <section
      className="bg-white border-t border-gray-100 overflow-hidden"
      style={{
        maskImage: "linear-gradient(to right, transparent 0%, black 25%, black 75%, transparent 100%)",
      }}
    >
      <style>{`
        @keyframes logo-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (max-width: 767px) {
          .logo-track { animation: logo-marquee 60s linear infinite; }
        }
      `}</style>
      <div
        className="logo-track flex py-5"
        style={{ width: "max-content" }}
      >
        {track.map((logo, index) => (
          <div key={index} className="flex items-center justify-center mx-5 md:mx-12">
            <img
              src={logo.src}
              alt={logo.alt}
              style={{ height: logo.large ? "38px" : "32px" }}
              className="w-auto object-contain"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
