import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "내화채움구조란? | 탑디뉴스",
  description: "내화채움구조의 개념, 법적 근거, 종류, 그리고 국내 주요 제조사 정보를 안내합니다.",
  keywords: "내화채움구조, 방화구획 관통부, 내화충전, 내화채움 제조사, 성능인정",
};

const types = [
  {
    title: "배관 관통부",
    desc: "급수·배수·소화 배관 등이 방화구획을 관통하는 부위에 적용되는 내화채움구조. 금속관, 합성수지관 등 재질에 따라 제품을 구분하여 사용합니다.",
  },
  {
    title: "덕트 관통부",
    desc: "공조·환기 덕트가 방화구획을 관통하는 부위에 적용되는 내화채움구조. 사각덕트 및 원형덕트의 크기와 형태에 맞춰 시공합니다.",
  },
  {
    title: "케이블·전선 관통부",
    desc: "전력선, 통신선 등 각종 케이블이 집합으로 관통하는 부위에 적용. 충전재(실란트, 모르타르 등)와 블록 타입으로 구분됩니다.",
  },
  {
    title: "복합 관통부",
    desc: "배관과 케이블 등 여러 종류의 관통물이 혼재하는 경우 복합 내화채움구조를 적용하며, 개별 성능인정서에 따라 시공합니다.",
  },
];

const manufacturers = [
  {
    name: "필립산업",
    categories: ["배관", "사각덕트"],
    note: "좋은 사람, 좋은 회사가 만드는 좋은 제품. 배관 및 사각덕트 관통부 내화채움구조 품질인정 보유.",
  },
  {
    name: "프로화이어 (ProFire)",
    categories: ["사각덕트"],
    note: "사각덕트 관통부 내화채움구조 품질인정 보유 전문 제조사.",
  },
  {
    name: "킹스아시아 (KingsAsia)",
    categories: ["사각덕트"],
    note: "킹스판 페놀릭덕트 및 층간방화 전문기업. 사각덕트 관통부 내화채움구조 품질인정 보유.",
  },
  {
    name: "세이프코리아",
    categories: ["배관", "사각덕트"],
    note: "2001년 설립, 국내 최초 내화채움구조 인증 취득. 화재확산을 막는 우리집 숨은 소방관.",
  },
  {
    name: "와이제이테크 (YJ Tech)",
    categories: ["배관"],
    note: "고정클램프 및 내화충전재 전문업체로서 끊임없는 연구개발로 특허기술·디자인 등록 제품을 보유. 일체형 고정틀로 간편한 시공과 인건비 절감 실현.",
  },
  {
    name: "아그니코리아",
    categories: ["배관", "사각덕트"],
    note: "기술 리더쉽에 기초한 변화와 도전으로, 하나뿐인 내화채움구조 기업을 지향.",
  },
  {
    name: "이지원 (EZONE)",
    categories: ["사각덕트"],
    note: "건축물 화재확산방지 신소재·기술 연구개발 전문기업. 한국건설기술원 원천기술 이전.",
  },
  {
    name: "피앤아이 (P&I)",
    categories: ["배관"],
    note: "건축물에서 인간이 최적의 생활을 누릴 수 있도록 끊임없이 연구개발하는 내화충전 전문기업.",
  },
  {
    name: "마가켐",
    categories: ["배관", "사각덕트"],
    note: "국민의 안전과 재산을 보호하는 일을 합니다. 내화충전재 전문 제조업체.",
  },
  {
    name: "유네트코리아",
    categories: ["배관"],
    note: "설비관통부 내화충전구조 전문기업. 내화채움재·방화슬리브·일체형클램프 등 배관 관통부 토탈 솔루션 제공.",
  },
  {
    name: "휴그린텍",
    categories: ["배관"],
    note: "내화충전재 내장형 배관 슬리브 특허 보유. 배관 관통부 내화채움구조 전문 제조사.",
  },
];

const categoryColors: Record<string, string> = {
  "배관": "bg-blue-100 text-blue-700",
  "사각덕트": "bg-orange-100 text-orange-700",
};

export default function FireResistancePage() {
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
            <p className="text-sm uppercase tracking-widest opacity-70 mb-2">Firestopping System</p>
            <h1 className="text-3xl md:text-5xl font-bold">내화채움구조란?</h1>
          </div>
        </section>

        {/* 개요 */}
        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              Overview
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">내화채움구조 개요</h2>
            <div className="w-10 h-0.5 mb-6" style={{ backgroundColor: "#014A99" }} />
            <p className="text-gray-600 leading-relaxed">
              <strong className="text-gray-800">내화채움구조</strong>란 건축물의 방화구획을 관통하는 배관·덕트·케이블 등의
              관통부에 화염·연기·유해가스가 번지지 않도록 차단하는 내화충전 시스템입니다.
            </p>
            <p className="text-gray-600 leading-relaxed mt-3">
              화재 발생 시 일정 시간(1~3시간) 동안 관통부의 차연·차열 성능을 확보하여 인명 대피와
              초기 진화에 필요한 시간을 벌어주는 핵심 방화 요소입니다.
            </p>

            {/* 법적 근거 */}
            <div className="mt-10 p-4 sm:p-6 rounded-2xl border-l-4 border-[#014A99] bg-[#f0f5fb]">
              <h3 className="text-lg font-bold text-gray-900 mb-3">법적 근거</h3>
              <ul className="text-gray-600 text-sm leading-relaxed space-y-3">
                <li>
                  <span className="font-medium text-gray-800">건축법 시행령 제46조 (방화구획 등의 설치)</span> —
                  방화구획을 관통하는 배관·덕트·케이블 등의 관통부에는 국토교통부 장관이 인정한 내화채움구조를 사용해야 합니다.
                </li>
                <li>
                  <span className="font-medium text-gray-800">건축법 제52조의5 (건축자재 등의 품질인정)</span> —
                  내화채움구조를 포함한 주요 건축자재는 품질인정을 받은 제품만 사용 가능합니다.
                  단순 성능시험 결과뿐 아니라 제조·품질관리체계 전반을 평가합니다.
                </li>
                <li>
                  <span className="font-medium text-gray-800">건축법 제52조의6 (품질인정기관의 지정·운영)</span> —
                  2020년 12월 건축법 개정으로 신설. 품질인정기관 지정 및 운영 근거를 마련하였습니다.
                </li>
                <li>
                  <span className="font-medium text-gray-800">건축자재등 품질인정 및 관리기준 (국토교통부 고시)</span> —
                  품질인정 신청·심사·발급·사후관리의 세부 절차를 규정합니다.
                </li>
                <li>
                  <span className="font-medium text-gray-800">건축물의 피난·방화구조 등의 기준에 관한 규칙</span> —
                  내화채움구조 시공 방법 및 품질관리서 제출 의무를 규정합니다.
                </li>
              </ul>
              <div className="mt-4 pt-4 border-t border-[#c8d9ee]">
                <p className="text-xs text-gray-500 leading-relaxed">
                  <span className="font-medium text-gray-700">품질인정제도 전환 (2021.12.23 시행)</span> —
                  기존 시험성적서 중심의 &quot;성능인정&quot;에서 제조·품질관리체계를 포함한 &quot;품질인정&quot; 제도로 전환되었습니다.
                  도입 배경은 2020년 건설현장 대형화재 재발 방지를 위한 정부의 화재안전대책입니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 종류 */}
        <section className="py-12 md:py-20" style={{ backgroundColor: "#f8fafd" }}>
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              Types
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">관통부 종류</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {types.map((item) => (
                <div key={item.title} className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <h3 className="text-base font-bold mb-2" style={{ color: "#014A99" }}>{item.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 제조사 */}
        <section id="manufacturers" className="py-12 md:py-20 bg-white">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            <p className="text-sm uppercase tracking-widest font-medium mb-2" style={{ color: "#5889BC" }}>
              Manufacturers
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">국내 주요 제조사</h2>
            <p className="text-gray-500 text-sm mb-8">
              아래 제조사들은 국토교통부 성능인정을 보유한 내화채움구조 전문 제조사입니다.
            </p>
            <div className="flex flex-col gap-4">
              {manufacturers.map((m) => (
                <div key={m.name} className="flex flex-col sm:flex-row sm:items-start gap-3 p-5 rounded-2xl border border-gray-100 hover:border-[#014A99] hover:shadow-sm transition-all duration-200">
                  <div className="sm:w-48 shrink-0">
                    <p className="font-bold text-gray-900 text-sm">{m.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {m.categories.map((cat) => (
                        <span key={cat} className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[cat]}`}>
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed">{m.note}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-6">
              * 위 목록은 참고용이며, 실제 성능인정 보유 현황은 국토교통부 건축행정시스템(세움터)에서 확인하시기 바랍니다.
            </p>

            {/* 문의하기 CTA */}
            <div className="mt-10 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5" style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)" }}>
              <div className="text-center sm:text-left">
                <p className="text-white font-bold text-lg sm:text-xl">내화채움구조 견적·기술 문의</p>
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
