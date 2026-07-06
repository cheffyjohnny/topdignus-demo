import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "탑디뉴스 | 내화채움구조 전문기업",
    template: "%s | 탑디뉴스",
  },
  description: "사각덕트 및 배관 내화채움구조 전문기업 탑디뉴스. 방화구획 관통부 내화채움 솔루션을 공급합니다. 공공기관·대기업 다수 납품.",
  keywords: "내화채움구조, 내화채움, 사각덕트 내화, 배관 내화, 방화구획, 관통부 내화, 탑디뉴스, Topdignus",
  metadataBase: new URL("https://topdignus.co.kr"),
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://topdignus.co.kr",
    siteName: "탑디뉴스",
    title: "탑디뉴스 | 내화채움구조 전문기업",
    description: "사각덕트 및 배관 내화채움구조 전문기업 탑디뉴스. 방화구획 관통부 내화채움 솔루션을 공급합니다.",
  },
  twitter: {
    card: "summary_large_image",
    title: "탑디뉴스 | 내화채움구조 전문기업",
    description: "사각덕트 및 배관 내화채움구조 전문기업 탑디뉴스. 방화구획 관통부 내화채움 솔루션을 공급합니다.",
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  verification: {
    other: {
      "naver-site-verification": "1313b32cbdf12264809330c1adeffcbafc290e09",
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://topdignus.co.kr/#organization",
      name: "탑디뉴스",
      alternateName: "Topdignus",
      url: "https://topdignus.co.kr",
      logo: {
        "@type": "ImageObject",
        url: "https://topdignus.co.kr/icon.png",
      },
      description: "사각덕트 및 배관 내화채움구조 전문기업. 방화구획 관통부 내화채움 솔루션 공급.",
      telephone: "+82-10-8884-4742",
      areaServed: "KR",
      knowsAbout: ["내화채움구조", "사각덕트 내화", "배관 내화", "방화구획", "firestopping"],
    },
    {
      "@type": "WebSite",
      "@id": "https://topdignus.co.kr/#website",
      url: "https://topdignus.co.kr",
      name: "탑디뉴스",
      publisher: { "@id": "https://topdignus.co.kr/#organization" },
      inLanguage: "ko-KR",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${geist.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
