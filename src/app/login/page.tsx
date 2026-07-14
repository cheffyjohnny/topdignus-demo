"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberUsername, setRememberUsername] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("saved_username");
    if (saved) {
      setUsername(saved);
      setRememberUsername(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (rememberUsername) {
      localStorage.setItem("saved_username", username);
    } else {
      localStorage.removeItem("saved_username");
    }

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      setError("Incorrect username or password.");
    } else {
      const session = await getSession();
      const role = (session?.user as any)?.role;
      if (role === "dealer") {
        router.push("/dealer");
      } else {
        router.push("/dashboard");
      }
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f8fafd" }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white"
        style={{ background: "linear-gradient(135deg, #014A99 0%, #0a5db5 100%)" }}
      >
        <a href="/">
          <Image
            src="/logo-bg-white.png"
            alt="Topdignus logo"
            width={90}
            height={33}
            className="object-contain"
            style={{ borderRadius: "4px" }}
          />
        </a>

        <div>
          <p className="text-sm uppercase tracking-widest opacity-60 mb-3">Topdignus Admin</p>
          <h1 className="text-3xl font-bold leading-snug mb-4">
            Welcome to Topdignus,<br />the fire-resistant filling<br />specialist.
          </h1>
          <p className="text-sm opacity-70 leading-relaxed">
            Sign in to access quote management,<br />
            inquiries, and other internal systems.
          </p>
        </div>

        <p className="text-xs opacity-40">© {new Date().getFullYear()} Topdignus. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <a href="/">
              <Image
                src="/logo.png"
                alt="Topdignus logo"
                width={90}
                height={33}
                className="object-contain"
              />
            </a>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign In</h2>
            <p className="text-sm text-gray-400">Please enter your account details.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="border border-gray-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#014A99] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <a href="#" className="text-xs hover:underline" style={{ color: "#014A99" }}>
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                required
                className="border border-gray-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#014A99] transition-colors"
              />
              {capsLock && (
                <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  Caps Lock is on.
                </p>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberUsername}
                onChange={(e) => setRememberUsername(e.target.checked)}
                className="w-4 h-4 rounded accent-[#014A99]"
              />
              <span className="text-sm text-gray-500">Remember username</span>
            </label>

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-md text-white font-semibold text-sm transition-colors mt-2 hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "#014A99" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            For inquiries, please contact{" "}
            <a href="mailto:topdi@topdignus.co.kr" className="underline" style={{ color: "#014A99" }}>
              topdi@topdignus.co.kr
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
