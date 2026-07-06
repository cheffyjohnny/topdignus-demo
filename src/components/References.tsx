const highlights = [
  "ASML (동탄·화성)",
  "삼성SDI (울산)",
  "LG화학 (청주)",
  "경동나비엔",
  "도쿄일렉트론 (평택)",
  "신세계 본점",
  "인천공항 T2",
  "광주과학기술원 (GIST)",
  "국립체육박물관",
  "한국수출입은행",
  "수원지방법원 안산지원",
  "래미안 (잠원)",
  "GS 자이 (과천·원주)",
  "롯데캐슬 (검단·부산)",
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
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">납품실적</h2>
          </div>
          <a
            href="/about/references"
            className="shrink-0 text-sm font-semibold text-[#014A99] hover:underline"
          >
            전체 보기 →
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
