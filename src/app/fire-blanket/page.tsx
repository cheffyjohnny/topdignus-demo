import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "방화포란? | 탑디뉴스",
  description: "방화포의 개념, 법적 근거, 용도, KFI 성능인증 기준 등을 안내합니다. 건설현장 화재위험작업 시 필수 안전 방화용품입니다.",
  keywords: "방화포, 방화포 성능인증, KFI, 한국소방산업기술원, 용접 불티 비산 방지, 건설현장 화재안전",
};

const applications = [
  {
    title: "아크용접·가스용접 작업",
    desc: "금속 용접 시 발생하는 고온의 불티(스파크)가 반경 수 미터까지 비산합니다. 작업 구간 주변에 방화포를 설치하여 인근 가연물로의 불티 전파를 차단합니다.",
  },
  {
    title: "가스절단·그라인더 작업",
    desc: "가스절단기와 그라인더 작업에서도 다량의 고온 불티가 발생합니다. 방화포로 작업 하부 및 측면을 감싸 바닥재·단열재 등 가연물을 보호합니다.",
  },
  {
    title: "건설현장 화재위험작업 구간",
    desc: "아파트·건축물 골조 및 마감 공사 단계에서 각종 용접·절단 작업이 집중됩니다. 건물 규모에 따라 수백~수만 m²의 방화포가 필요하며, 현장 이동 및 재설치가 용이합니다.",
  },
  {
    title: "고소·밀폐 작업 구간",
    desc: "고층 외벽, 천장 배관, 좁은 기계실 등 화재 발생 시 대피가 어려운 구간의 용접 작업에서 방화포를 필수로 사용합니다.",
  },
];

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    ),
    title: "고내열성 소재",
    desc: "세라믹 섬유·유리섬유 계열 소재를 사용하여 용접·절단 불티의 고온에도 형태를 유지하고 착화되지 않습니다.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "불티관통시험 인증",
    desc: "KFI 성능인증의 핵심 검사 항목인 불티관통시험(Spark Penetration Test)을 통과한 제품만 현장에 사용할 수 있습니다.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    title: "현장 이동·재설치 용이",
    desc: "유연한 직물 형태로 말아서 이동이 가능합니다. 3m 단위로 제품검사 표식이 부착되어 규격 확인과 관리가 편리합니다.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: "성능인증 의무화 대응",
    desc: "2025년 3월 2일부터 산업안전보건기준에 관한 규칙 개정으로 KFI 성능인증 방화포 사용이 법적으로 의무화되었습니다.",
  },
];

export default function FireBlanketPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section
          className="py-16 text-white"
          style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)" }}
        >
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest opacity-70 mb-2">Fire Blanket</p>
            <h1 className="text-3xl md:text-5xl font-bold">방화포란?</h1>
          </div>
        </section>

        {/* 개요 */}
        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              Overview
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">방화포 개요</h2>
            <div className="w-10 h-0.5 mb-6" style={{ backgroundColor: "#014A99" }} />
            <p className="text-gray-600 leading-relaxed">
              <strong className="text-gray-800">방화포</strong>는 건설현장에서 용접·가스절단·그라인더 등
              화재위험작업 시 발생하는 불티(스파크)가 주변 가연물로 비산하여 화재가 발생하는 것을 막기 위한
              내열성 직물 소재의 안전 방화용품입니다.
            </p>
            <p className="text-gray-600 leading-relaxed mt-3">
              방화구획 관통부에 영구 시공하는 내화채움구조와는 용도가 다르며, 작업 중 임시로 설치하고
              철거하는 방식으로 사용됩니다. 건물 규모 및 공정에 따라 수백~수만 m²가 필요할 수 있습니다.
            </p>
            <p className="text-gray-600 leading-relaxed mt-3">
              국내에서는 한국소방산업기술원(KFI)이 방화포 성능인증을 담당하며,
              2025년 3월 2일부터 성능인증 제품 사용이 법적으로 의무화되었습니다.
            </p>

            {/* 법적 근거 */}
            <div className="mt-10 p-4 sm:p-6 rounded-2xl border-l-4 border-[#014A99] bg-[#f0f5fb]">
              <h3 className="text-lg font-bold text-gray-900 mb-3">법적 근거 및 인증 제도</h3>
              <ul className="text-gray-600 text-sm leading-relaxed space-y-3">
                <li>
                  <span className="font-medium text-gray-800">건설현장의 화재안전기준 (소방청 고시, 2023.7.1 시행)</span> —
                  소방청이 건설현장 화재안전기준에 방화포 규정을 신설하였습니다.
                  화재위험작업 구간에 방화포 설치 의무가 명시되었습니다.
                </li>
                <li>
                  <span className="font-medium text-gray-800">산업안전보건기준에 관한 규칙 개정 (2025.3.2 시행)</span> —
                  &quot;성능인증을 받은 방화포를 의무적으로 사용해야 한다&quot;는 규정이 본격 시행되었습니다.
                  기존 KOSHA GUIDE(안전보건공단 기술지침) 기반 제품은 더 이상 사용할 수 없습니다.
                </li>
                <li>
                  <span className="font-medium text-gray-800">한국소방산업기술원(KFI) 방화포 성능인증</span> —
                  KFI가 성능인증 전담 기관으로서 불티관통시험(Spark Penetration Test) 등 주요 항목을 심사합니다.
                  현재 성능인증을 보유한 제조사는 7개사입니다.
                </li>
                <li>
                  <span className="font-medium text-gray-800">방화포 성능인증 및 제품검사의 기술기준 (소방청 고시)</span> —
                  방화포의 성능인증 신청·심사·발급 및 제품검사에 관한 세부 기술기준을 규정합니다.
                  제품에는 3m 단위로 검사 합격 표식(스티커)이 부착되어야 합니다.
                </li>
              </ul>
              <div className="mt-4 pt-4 border-t border-[#c8d9ee]">
                <p className="text-xs text-gray-500 leading-relaxed">
                  <span className="font-medium text-gray-700">성능인증 확인</span> —
                  방화포 성능인증 현황은 한국소방산업기술원(KFI) 공식 홈페이지에서 조회하실 수 있습니다.
                  인증 번호·제조사·제품명·유효기간 등을 반드시 확인 후 사용하시기 바랍니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 특징 */}
        <section className="py-12 md:py-20" style={{ backgroundColor: "#f8fafd" }}>
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              Features
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">방화포 주요 특징</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {features.map((f) => (
                <div key={f.title} className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm flex gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#f0f5fb] flex items-center justify-center shrink-0" style={{ color: "#014A99" }}>
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">{f.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 적용 부위 */}
        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              Applications
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">주요 적용 작업 및 현장</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {applications.map((item) => (
                <div key={item.title} className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <h3 className="text-base font-bold mb-2" style={{ color: "#014A99" }}>{item.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 md:py-20" style={{ backgroundColor: "#f8fafd" }}>
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <div
              className="rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5"
              style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)" }}
            >
              <div className="text-center sm:text-left">
                <p className="text-white font-bold text-lg sm:text-xl">방화포 견적·기술 문의</p>
                <p className="text-white opacity-75 text-sm mt-1">담당자 확인 후 신속히 회신 드리겠습니다.</p>
              </div>
              <a
                href="/contact"
                className="w-full sm:w-auto text-center shrink-0 px-8 py-3 rounded-md font-semibold text-[#014A99] bg-white hover:bg-[#f0f5fb] transition-colors text-sm"
              >
                문의하기 →
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
