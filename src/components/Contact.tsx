"use client";

import { useState, useEffect, useRef } from "react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", message: "" });
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errors, setErrors] = useState<Partial<typeof form> & { agreed?: string }>({});

  // 이메일 인증 상태
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startTimer = () => {
    setTimer(300);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    // 이메일 변경 시 인증 초기화
    if (name === "email") {
      setEmailVerified(false);
      setOtpSent(false);
      setOtpValue("");
      setOtpError("");
      if (timerRef.current) clearInterval(timerRef.current);
      setTimer(0);
      // 실시간 이메일 형식 검사
      if (value.trim() && !isEmailValid(value)) {
        setErrors((prev) => ({ ...prev, email: "Please enter a valid email address." }));
      } else {
        setErrors((prev) => ({ ...prev, email: "" }));
      }
    }
  };

  const handleSendOtp = async () => {
    const email = form.email.trim();
    if (!email) {
      setErrors((prev) => ({ ...prev, email: "Please enter your email." }));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors((prev) => ({ ...prev, email: "Please enter a valid email address." }));
      return;
    }

    setOtpLoading(true);
    setOtpError("");
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setOtpLoading(false);

    if (res.ok) {
      setOtpSent(true);
      setOtpValue("");
      setEmailVerified(false);
      startTimer();
    } else {
      setOtpError(data.error || "Failed to send email.");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValue.trim()) {
      setOtpError("Please enter the verification code.");
      return;
    }
    if (timer === 0) {
      setOtpError("The verification code has expired. Please request again.");
      return;
    }

    setVerifyLoading(true);
    setOtpError("");
    const res = await fetch("/api/email/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, code: otpValue }),
    });
    const data = await res.json();
    setVerifyLoading(false);

    if (res.ok) {
      setEmailVerified(true);
      setOtpSent(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setErrors((prev) => ({ ...prev, email: "" }));
    } else {
      setOtpError(data.error || "Verification failed.");
    }
  };

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!form.name.trim()) newErrors.name = "Please enter your name.";
    if (!form.company.trim()) newErrors.company = "Please enter your company name.";
    if (!form.phone.trim()) newErrors.phone = "Please enter your phone number.";
    else if (!/^[0-9+\-\s()]{7,20}$/.test(form.phone.trim())) newErrors.phone = "Please enter a valid phone number.";
    if (!form.email.trim()) newErrors.email = "Please enter your email.";
    else if (!emailVerified) newErrors.email = "Please complete email verification.";
    if (!form.message.trim()) newErrors.message = "Please enter your inquiry.";
    if (!agreed) newErrors.agreed = "Please agree to the collection and use of personal information.";
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setStatus("loading");

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setStatus("success");
      setForm({ name: "", company: "", phone: "", email: "", message: "" });
      setAgreed(false);
      setEmailVerified(false);
      setOtpSent(false);
      setOtpValue("");
    } else {
      setStatus("error");
    }
  };

  return (
    <section id="contact" className="pt-12 md:pt-24 pb-2 md:pb-4" style={{ backgroundColor: "#ffffff" }}>
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6">
        <div className="rounded-xl px-4 py-6 sm:px-8 sm:py-8" style={{ backgroundColor: "#f8fafd" }}>
          <div className="flex flex-col md:flex-row gap-12 items-start">
            {/* Left side text */}
            <div className="md:w-1/2">
              <p className="text-sm uppercase tracking-widest font-medium mb-4" style={{ color: "#5889BC" }}>Contact Us</p>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-snug">
                Submit a <span style={{ color: "#014A99" }}>new quote or technical inquiry</span><br />
                easily online.
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Leave your fire-resistant filling quote or technical inquiry,<br />
                and our team will review it and respond promptly.
              </p>
            </div>

            {/* Right side form */}
            <div className="md:w-1/2 w-full">
              {status === "success" ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#014A99] flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-800 font-semibold text-lg">Your inquiry has been received.</p>
                  <p className="text-gray-500 text-sm">Our team will review it and respond promptly.</p>
                  <button
                    onClick={() => setStatus("idle")}
                    className="mt-4 text-sm text-[#014A99] underline"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Name"
                        className={`border rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#014A99] transition-colors ${errors.name ? "border-red-400" : "border-gray-200"}`}
                      />
                      {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        name="company"
                        value={form.company}
                        onChange={handleChange}
                        placeholder="Company"
                        className={`border rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#014A99] transition-colors ${errors.company ? "border-red-400" : "border-gray-200"}`}
                      />
                      {errors.company && <p className="text-red-500 text-xs">{errors.company}</p>}
                    </div>
                  </div>

                  {/* 연락처 */}
                  <div className="flex flex-col gap-1">
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="Phone"
                      className={`border rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#014A99] transition-colors ${errors.phone ? "border-red-400" : "border-gray-200"}`}
                    />
                    {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
                  </div>

                  {/* 이메일 + 인증 */}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={handleChange}
                          placeholder="Email"
                          disabled={emailVerified}
                          className={`w-full border rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#014A99] transition-colors ${errors.email ? "border-red-400" : emailVerified ? "border-green-400 bg-green-50" : "border-gray-200"} disabled:cursor-not-allowed`}
                        />
                        {emailVerified && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </div>
                      {!emailVerified && (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={otpLoading || !form.email.trim() || !isEmailValid(form.email)}
                          className="shrink-0 px-4 py-3 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[#014A99] hover:bg-[#5889BC]"
                        >
                          {otpLoading ? "Sending..." : otpSent ? "Resend" : "Get Verification Code"}
                        </button>
                      )}
                      {emailVerified && (
                        <button
                          type="button"
                          onClick={() => {
                            setEmailVerified(false);
                            setForm((prev) => ({ ...prev, email: "" }));
                            setOtpSent(false);
                            setOtpValue("");
                            setOtpError("");
                          }}
                          className="shrink-0 px-4 py-3 rounded-md text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                          Change
                        </button>
                      )}
                    </div>

                    {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
                    {emailVerified && <p className="text-green-600 text-xs font-medium">Email verified.</p>}

                    {/* OTP 입력 영역 */}
                    {otpSent && !emailVerified && (
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              value={otpValue}
                              onChange={(e) => { setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(""); }}
                              placeholder="6-digit code"
                              maxLength={6}
                              className={`w-full border rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#014A99] transition-colors ${otpError ? "border-red-400" : "border-gray-200"}`}
                            />
                            {timer > 0 && (
                              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono ${timer <= 60 ? "text-red-500" : "text-gray-400"}`}>
                                {formatTimer(timer)}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={verifyLoading || timer === 0}
                            className="shrink-0 px-4 py-3 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[#014A99] hover:bg-[#5889BC]"
                          >
                            {verifyLoading ? "Verifying..." : "Verify"}
                          </button>
                        </div>
                        {otpError && <p className="text-red-500 text-xs">{otpError}</p>}
                        {timer === 0 && <p className="text-red-500 text-xs">The verification code has expired. Please click Resend.</p>}
                      </div>
                    )}

                    {!otpSent && otpError && <p className="text-red-500 text-xs">{otpError}</p>}
                  </div>

                  <div className="flex flex-col gap-1">
                    <textarea
                      rows={5}
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Please enter your inquiry."
                      className={`border rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#014A99] transition-colors resize-none ${errors.message ? "border-red-400" : "border-gray-200"}`}
                    />
                    {errors.message && <p className="text-red-500 text-xs">{errors.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-start gap-2 text-sm text-gray-500">
                      <input
                        type="checkbox"
                        id="privacy"
                        checked={agreed}
                        onChange={(e) => { setAgreed(e.target.checked); setErrors((prev) => ({ ...prev, agreed: "" })); }}
                        className="mt-0.5 accent-[#014A99]"
                      />
                      <label htmlFor="privacy">
                        I agree to the <span className="text-gray-700 font-medium">collection and use of personal information</span>. <span className="text-xs">(Required)</span>
                      </label>
                    </div>
                    {errors.agreed && <p className="text-red-500 text-xs">{errors.agreed}</p>}
                  </div>
                  {status === "error" && (
                    <p className="text-red-500 text-sm">An error occurred. Please try again.</p>
                  )}
                  <button
                    type="submit"
                    disabled={status === "loading" || !agreed || !emailVerified}
                    className="w-full py-3 rounded-md text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-[#014A99] hover:bg-[#5889BC]"
                  >
                    {status === "loading" ? "Sending..." : "Send Inquiry"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
