"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const SITEMAP = [
  {
    label: "회사",
    links: [
      { href: "/", text: "홈" },
      { href: "/about", text: "회사소개" },
      { href: "/about/references", text: "납품실적" },
      { href: "/contact", text: "문의하기" },
    ],
  },
  {
    label: "내화채움구조",
    links: [
      { href: "/fire-resistance", text: "내화채움구조란?" },
      { href: "/fire-resistance/organizations", text: "운영기관 및 관련정보" },
    ],
  },
];

export default function Footer() {
  const [showToast, setShowToast] = useState(false);

  function handleSubscribeClick() {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }

  return (
    <>
      <footer className="text-white" style={{ backgroundColor: "#014A99" }}>
        <div className="max-w-[980px] mx-auto px-6 py-7">
          <div className="flex flex-col md:flex-row gap-8 items-start">

            {/* Sitemap */}
            <div className="flex gap-10">
              {SITEMAP.map((section) => (
                <div key={section.label}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
                    {section.label}
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="text-xs text-white/70 hover:text-white transition-colors"
                        >
                          {link.text}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Vertical divider */}
            <div className="hidden md:block self-stretch w-px bg-white/10" />

            {/* Newsletter */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1.5">
                Newsletter
              </p>
              <p className="text-xs text-white/70 mb-3">
                법령·인정 최신 소식을 이메일로 받아보세요
              </p>
              <button
                onClick={handleSubscribeClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#014A99] bg-white hover:bg-[#f0f5fb] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                구독 신청하기
              </button>
            </div>

            {/* Spacer */}
            <div className="flex-1 hidden md:block" />

            {/* Logo + Company info */}
            <div className="flex flex-col gap-2 md:items-end">
              <Image
                src="/logo-bg-white.png"
                alt="탑디뉴스 로고"
                width={62}
                height={23}
                className="object-contain"
                style={{ borderRadius: "4px" }}
              />
              <div className="flex flex-col gap-1 text-xs text-white/60 md:text-right">
                <p className="text-white/80 font-medium">탑디뉴스 (Topdignus)</p>
                <p>내화채움 전문기업</p>
                <p>topdi@topdignus.co.kr</p>
              </div>
            </div>

          </div>

          {/* Bottom */}
          <div className="mt-5 pt-4 border-t border-white/10 text-xs text-white/30 text-right">
            <span>© {new Date().getFullYear()} 탑디뉴스 (Topdignus). All rights reserved.</span>
          </div>
        </div>
      </footer>

      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-gray-800 whitespace-nowrap">
          현재 준비 중입니다. 곧 서비스될 예정입니다 🙏
        </div>
      )}
    </>
  );
}
