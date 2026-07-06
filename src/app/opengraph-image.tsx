import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "탑디뉴스 - 내화채움구조 전문기업";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 100px",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* 배경 장식 원 */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-120px",
            right: "200px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
          }}
        />

        {/* 상단 라벨 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.15)",
              borderRadius: "20px",
              padding: "8px 20px",
              color: "rgba(255,255,255,0.9)",
              fontSize: "18px",
              letterSpacing: "0.1em",
            }}
          >
            TOPDIGNUS
          </div>
        </div>

        {/* 메인 타이틀 */}
        <div
          style={{
            color: "#ffffff",
            fontSize: "72px",
            fontWeight: "bold",
            lineHeight: 1.1,
            marginBottom: "24px",
          }}
        >
          탑디뉴스
        </div>

        {/* 구분선 */}
        <div
          style={{
            width: "60px",
            height: "4px",
            background: "rgba(255,255,255,0.6)",
            marginBottom: "28px",
            borderRadius: "2px",
          }}
        />

        {/* 서브타이틀 */}
        <div
          style={{
            color: "rgba(255,255,255,0.85)",
            fontSize: "34px",
            fontWeight: "500",
            marginBottom: "16px",
          }}
        >
          내화채움구조 전문기업
        </div>

        {/* 설명 */}
        <div
          style={{
            color: "rgba(255,255,255,0.65)",
            fontSize: "22px",
            lineHeight: 1.5,
          }}
        >
          사각덕트 · 배관 내화채움 솔루션
        </div>

        {/* 하단 도메인 */}
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            right: "100px",
            color: "rgba(255,255,255,0.45)",
            fontSize: "20px",
          }}
        >
          topdignus.co.kr
        </div>
      </div>
    ),
    size
  );
}
