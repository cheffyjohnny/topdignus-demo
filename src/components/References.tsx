const highlights = [
  "ASML (Dongtan/Hwaseong)",
  "Samsung SDI (Ulsan)",
  "LG Chem (Cheongju)",
  "Kyungdong Navien",
  "Tokyo Electron (Pyeongtaek)",
  "Shinsegae Main Store",
  "Incheon Airport T2",
  "Gwangju Institute of Science and Technology (GIST)",
  "National Sports Museum",
  "Export-Import Bank of Korea",
  "Suwon District Court, Ansan Branch",
  "Raemian (Jamwon)",
  "GS Xi (Gwacheon/Wonju)",
  "Lotte Castle (Geomdan/Busan)",
];

export default function References() {
  return (
    <section className="py-12 md:py-20 bg-white">
      <div className="max-w-[980px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              References
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Track Record</h2>
          </div>
          <a
            href="/about/references"
            className="shrink-0 text-sm font-semibold text-[#014A99] hover:underline"
          >
            View All →
          </a>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {highlights.map((name) => (
            <span
              key={name}
              className="px-3.5 py-1.5 rounded-full text-sm text-gray-700 font-medium border border-gray-200 bg-white"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
