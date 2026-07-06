"use client";

import { signOut } from "next-auth/react";

export function LogoutButton({ variant = 'default' }: { variant?: 'default' | 'light' }) {
  const cls = variant === 'light'
    ? "text-sm text-white/70 hover:text-white border border-white/30 hover:border-white/60 rounded-md px-3 py-1.5 transition-colors"
    : "text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-md px-3 py-1.5 transition-colors hover:border-gray-300"
  return (
    <button
      onClick={() => {
        try { sessionStorage.removeItem("sidebar_sections") } catch {}
        signOut({ callbackUrl: "/login" })
      }}
      className={cls}
    >
      로그아웃
    </button>
  );
}
