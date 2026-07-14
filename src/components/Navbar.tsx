"use client";

import Image from "next/image";
import { useState } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="max-w-[1536px] mx-auto pl-6 pr-12 py-3 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Topdignus logo"
            width={98}
            height={35}
            className="w-[56px] md:w-[78px] h-auto object-contain"
            priority
          />
        </a>

        {/* Desktop Nav links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <div className="relative group">
            <a href="/about" className="hover:text-[#014A99] transition-colors flex items-center gap-1">
              Company
              <svg className="w-3 h-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
            <div className="absolute top-full left-0 mt-2 w-36 bg-white rounded-md shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
              {[
                { label: "About us", href: "/about" },
                { label: "Track Record", href: "/about/references" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="block px-4 py-2.5 text-sm text-gray-600 hover:text-[#014A99] hover:bg-[#f0f5fb] transition-colors first:rounded-t-md last:rounded-b-md"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
          {/* 제품소개 숨김 */}
          {/* <div className="relative group">
            <a href="/products/pipe" className="hover:text-[#014A99] transition-colors flex items-center gap-1">
              제품소개 ...
            </a>
          </div> */}
          <div className="relative group">
            <a href="/fire-resistance" className="hover:text-[#014A99] transition-colors flex items-center gap-1">
              Fire-Resistant Filling
              <svg className="w-3 h-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
            <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-md shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
              {[
                { label: "What is Fire-Resistant Filling?", href: "/fire-resistance" },
                { label: "Organizations & Resources", href: "/fire-resistance/organizations" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="block px-4 py-2.5 text-sm text-gray-600 hover:text-[#014A99] hover:bg-[#f0f5fb] transition-colors first:rounded-t-md"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
          <div className="relative group">
            <a href="/fire-blanket" className="hover:text-[#014A99] transition-colors flex items-center gap-1">
              Fire Blanket
              <svg className="w-3 h-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
            <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-md shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
              {[
                { label: "What is a Fire Blanket?", href: "/fire-blanket" },
                { label: "Organizations & Resources", href: "/fire-blanket/organizations" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="block px-4 py-2.5 text-sm text-gray-600 hover:text-[#014A99] hover:bg-[#f0f5fb] transition-colors first:rounded-t-md last:rounded-b-md"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
          <a href="/partnership" className="hover:text-[#014A99] transition-colors">
            Partnership
          </a>
          <a href="/contact" className="hover:text-[#014A99] transition-colors">
            Contact Us
          </a>
        </nav>


        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Open menu"
        >
          <span className={`block w-6 h-0.5 bg-gray-700 transition-transform ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-6 h-0.5 bg-gray-700 transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block w-6 h-0.5 bg-gray-700 transition-transform ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 flex flex-col gap-4 text-sm font-medium text-gray-600">
          <div className="flex flex-col gap-2">
            <p className="text-gray-400 text-xs uppercase tracking-widest">Company</p>
            <a href="/about" className="pl-2 hover:text-[#014A99] transition-colors" onClick={() => setMenuOpen(false)}>About us</a>
            <a href="/about/references" className="pl-2 hover:text-[#014A99] transition-colors" onClick={() => setMenuOpen(false)}>Track Record</a>
          </div>
          {/* Product intro hidden */}
          <div className="flex flex-col gap-2">
            <p className="text-gray-400 text-xs uppercase tracking-widest">Fire-Resistant Filling</p>
            <a href="/fire-resistance" className="pl-2 hover:text-[#014A99] transition-colors" onClick={() => setMenuOpen(false)}>What is Fire-Resistant Filling?</a>
            <a href="/fire-resistance/organizations" className="pl-2 hover:text-[#014A99] transition-colors" onClick={() => setMenuOpen(false)}>Organizations & Resources</a>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-gray-400 text-xs uppercase tracking-widest">Fire Blanket</p>
            <a href="/fire-blanket" className="pl-2 hover:text-[#014A99] transition-colors" onClick={() => setMenuOpen(false)}>What is a Fire Blanket?</a>
            <a href="/fire-blanket/organizations" className="pl-2 hover:text-[#014A99] transition-colors" onClick={() => setMenuOpen(false)}>Organizations & Resources</a>
          </div>
          <a href="/partnership" className="hover:text-[#014A99] transition-colors" onClick={() => setMenuOpen(false)}>
            Partnership
          </a>
          <a href="/contact" className="hover:text-[#014A99] transition-colors" onClick={() => setMenuOpen(false)}>
            Contact Us
          </a>
        </div>
      )}
    </header>
  );
}
