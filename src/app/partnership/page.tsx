import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PartnershipForm from "@/components/PartnershipForm";

export const metadata: Metadata = {
  title: "파트너십 | 탑디뉴스",
  description: "탑디뉴스 공식 대리점 파트너 신청. 내화채움구조 전문 유통 네트워크에 함께하세요.",
};

const BENEFITS = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: "원활한 의사소통",
    desc: "담당자 직통 연결로 견적·납기·현장 이슈를 빠르게 처리합니다.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "신속한 납기 처리",
    desc: "현장 일정에 맞춘 빠른 공급 대응으로 납기 리스크를 최소화합니다.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "경쟁력 있는 공급가",
    desc: "대리점 전용 단가 구조로 안정적인 마진을 확보할 수 있습니다.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    title: "기술·시공 지원",
    desc: "내화채움구조 전문 기술 자료 및 시공 매뉴얼을 제공합니다.",
  },
];

const STEPS = [
  { no: "01", title: "신청서 제출", desc: "아래 양식을 작성하여 파트너십 신청을 제출합니다." },
  { no: "02", title: "상호 협의", desc: "담당 지역, 공급 조건 등 세부 사항을 함께 조율합니다." },
  { no: "03", title: "MOU 체결", desc: "담당자 연락 후 조건 협의 및 MOU를 체결합니다." },
  { no: "04", title: "공급 시작", desc: "계약 완료 후 즉시 제품 공급 및 기술 지원이 시작됩니다." },
];

export default function PartnershipPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section
          className="py-20 text-white"
          style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)" }}
        >
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest opacity-70 mb-3">Partnership</p>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">
              탑디뉴스와 함께<br />성장하는 파트너
            </h1>
            <p className="mt-5 opacity-80 text-sm md:text-base max-w-xl leading-relaxed">
              내화채움구조 전문 유통 네트워크를 함께 구축할 공식 대리점 파트너를 모집합니다.
              귀사의 지역에서 안정적인 수익 기반을 만들어 보세요.
            </p>
            <a
              href="#apply"
              className="mt-8 inline-block px-7 py-3.5 rounded-lg font-semibold text-sm bg-white text-[#014A99] hover:bg-blue-50 transition-colors"
            >
              파트너십 신청하기
            </a>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              Why Partner
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-10">파트너 혜택</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {BENEFITS.map((b) => (
                <div key={b.title} className="flex gap-5 p-6 rounded-2xl border border-gray-100 hover:border-[#014A99]/20 hover:bg-[#f8fafd] transition-colors">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-[#EBF2FF] flex items-center justify-center text-[#014A99]">
                    {b.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1.5">{b.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Process */}
        <section className="py-16 md:py-24" style={{ backgroundColor: "#f8fafd" }}>
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              Process
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-10">파트너 등록 절차</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {STEPS.map((s, i) => (
                <div key={s.no} className="relative">
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-6 left-full w-full h-px bg-gray-200 -translate-y-1/2 z-0" style={{ width: "calc(100% - 48px)", left: "48px" }} />
                  )}
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold mb-4 text-white" style={{ backgroundColor: "#014A99" }}>
                      {s.no}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Form */}
        <section id="apply" className="py-16 md:py-24 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <div className="max-w-2xl mx-auto">
              <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
                Apply
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">파트너십 신청</h2>
              <p className="text-gray-500 text-sm mb-8">
                아래 양식을 작성해 주시면 담당자가 검토 후 3~5 영업일 내에 연락드립니다.
              </p>
              <PartnershipForm />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
