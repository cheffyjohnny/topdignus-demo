import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";

export const metadata: Metadata = {
  title: "사각덕트 내화채움 | 탑디뉴스",
  description: "탑디뉴스의 사각덕트 내화채움구조 제품. Philip Industry, Pro Fire, Kings Asia 제조사의 덕트 관통부 내화채움 시스템.",
  keywords: "사각덕트 내화채움, 덕트 방화구획, 사각덕트 내화구조, 덕트 관통부 내화, Kings Asia, Pro Fire, Philip 덕트",
};

const manufacturers = [
  {
    name: "Philip Industry",
    logo: "/logo_phillip.png",
    href: "/products/square-duct/phillip",
  },
  // {
  //   name: "Pro fire",
  //   logo: "/logo_pf.png",
  //   href: "/products/square-duct/profire",
  // },
  // {
  //   name: "Kings Asia",
  //   logo: "/logo_kingsAsia.avif",
  //   href: "/products/square-duct/kingsasia",
  // },
];

export default function SquareDuctPage() {
  return (
    <>
      <Navbar />
      <main>
        <section
          className="py-16 text-white"
          style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)" }}
        >
          <div className="max-w-[980px] mx-auto px-6">
            <p className="text-sm uppercase tracking-widest opacity-70 mb-2">Products</p>
            <h1 className="text-3xl md:text-5xl font-bold">사각덕트 내화채움</h1>
            <p className="mt-4 opacity-80 text-sm md:text-base">Square Duct Firestopping</p>
          </div>
        </section>

        <section className="py-20 bg-white min-h-[51.2vh]">
          <div className="max-w-[980px] mx-auto px-6">
            <div className="inline-block mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">제조사 선택</h2>
              <div className="h-0.5 w-full" style={{ backgroundColor: "#014A99" }} />
            </div>

            <div className="flex flex-wrap gap-6">
              {manufacturers.map((m) => (
                <a
                  key={m.name}
                  href={m.href}
                  className="group flex flex-col items-center justify-center w-48 h-36 rounded-2xl border border-black hover:border-[#014A99] hover:shadow-md hover:scale-105 transition-all duration-200"
                >
                  <Image
                    src={m.logo}
                    alt={m.name}
                    width={156}
                    height={65}
                    className="object-contain"
                  />
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
