"use client";

import { useState, useEffect, useRef } from "react";

const INPUT_CLS = "w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#014A99] transition-colors";
const ERROR_CLS = "w-full border border-red-400 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-red-400 transition-colors";

const isEmailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function PartnershipForm() {
  const [form, setForm] = useState({
    name: "", company: "", phone: "", email: "", region: "", needsCrew: "", message: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Partial<typeof form> & { agreed?: string }>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

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

  function startTimer() {
    setTimer(300);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => { if (prev <= 1) { clearInterval(timerRef.current!); return 0; } return prev - 1; });
    }, 1000);
  }

  function formatTimer(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) setErrors(prev => ({ ...prev, [name]: "" }));
    if (name === "email") {
      setEmailVerified(false); setOtpSent(false); setOtpValue(""); setOtpError("");
      if (timerRef.current) clearInterval(timerRef.current);
      setTimer(0);
      if (value.trim() && !isEmailValid(value)) setErrors(prev => ({ ...prev, email: "Please enter a valid email address." }));
      else setErrors(prev => ({ ...prev, email: "" }));
    }
  }

  async function handleSendOtp() {
    if (!isEmailValid(form.email)) { setErrors(prev => ({ ...prev, email: "Please enter a valid email address." })); return; }
    setOtpLoading(true); setOtpError("");
    const res = await fetch("/api/email/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email }),
    });
    const data = await res.json();
    setOtpLoading(false);
    if (res.ok) { setOtpSent(true); setOtpValue(""); setEmailVerified(false); startTimer(); }
    else setOtpError(data.error || "Failed to send email.");
  }

  async function handleVerifyOtp() {
    if (!otpValue.trim()) { setOtpError("Please enter the verification code."); return; }
    if (timer === 0) { setOtpError("The verification code has expired. Please request again."); return; }
    setVerifyLoading(true); setOtpError("");
    const res = await fetch("/api/email/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, code: otpValue }),
    });
    const data = await res.json();
    setVerifyLoading(false);
    if (res.ok) {
      setEmailVerified(true); setOtpSent(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setErrors(prev => ({ ...prev, email: "" }));
    } else setOtpError(data.error || "Verification failed.");
  }

  function validate() {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Please enter the contact name.";
    if (!form.company.trim()) e.company = "Please enter your company name.";
    if (!form.phone.trim()) e.phone = "Please enter a phone number.";
    else if (!/^[0-9+\-\s()]{7,20}$/.test(form.phone.trim())) e.phone = "Please enter a valid phone number.";
    if (!form.email.trim()) e.email = "Please enter your email.";
    else if (!emailVerified) e.email = "Please complete email verification.";
    if (!form.region.trim()) e.region = "Please enter your desired territory.";
    if (!agreed) e.agreed = "Please agree to the collection and use of personal information.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setStatus("loading");
    const res = await fetch("/api/partnership", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setStatus(res.ok ? "success" : "error");
  }

  function handleReset() {
    setStatus("idle");
    setForm({ name:"",company:"",phone:"",email:"",region:"",needsCrew:"",message:"" });
    setAgreed(false); setEmailVerified(false); setOtpSent(false); setOtpValue(""); setOtpError("");
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-[#014A99] flex items-center justify-center">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-gray-900 font-semibold text-lg mt-1">Your application has been received.</p>
        <p className="text-gray-500 text-sm">Our team will review it and contact you soon.</p>
        <button onClick={handleReset} className="mt-3 text-sm text-[#014A99] underline">Submit Another Application</button>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <input name="name" value={form.name} onChange={handleChange} placeholder="Contact Name *"
            className={errors.name ? ERROR_CLS : INPUT_CLS} />
          {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <input name="company" value={form.company} onChange={handleChange} placeholder="Company *"
            className={errors.company ? ERROR_CLS : INPUT_CLS} />
          {errors.company && <p className="text-red-500 text-xs">{errors.company}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone *"
          className={errors.phone ? ERROR_CLS : INPUT_CLS} />
        {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
      </div>

      {/* 이메일 + OTP */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input name="email" type="email" value={form.email} onChange={handleChange}
              placeholder="Email *" disabled={emailVerified}
              className={`${errors.email ? ERROR_CLS : emailVerified ? "w-full border border-green-400 bg-green-50 rounded-lg px-4 py-3 text-sm focus:outline-none" : INPUT_CLS} disabled:cursor-not-allowed`} />
            {emailVerified && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </div>
          {!emailVerified ? (
            <button type="button" onClick={handleSendOtp}
              disabled={otpLoading || !form.email.trim() || !isEmailValid(form.email)}
              className="shrink-0 px-4 py-3 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[#014A99] hover:bg-[#0057b8]">
              {otpLoading ? "Sending..." : otpSent ? "Resend" : "Get Verification Code"}
            </button>
          ) : (
            <button type="button"
              onClick={() => { setEmailVerified(false); setForm(p => ({ ...p, email: "" })); setOtpSent(false); setOtpValue(""); setOtpError(""); }}
              className="shrink-0 px-4 py-3 rounded-lg text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-100 transition-colors">
              Change
            </button>
          )}
        </div>
        {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
        {emailVerified && <p className="text-green-600 text-xs font-medium">Email verified.</p>}
        {!otpSent && otpError && <p className="text-red-500 text-xs">{otpError}</p>}

        {otpSent && !emailVerified && (
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input type="text" value={otpValue}
                  onChange={e => { setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(""); }}
                  placeholder="6-digit code" maxLength={6}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#014A99] transition-colors ${otpError ? "border-red-400" : "border-gray-200"}`} />
                {timer > 0 && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono ${timer <= 60 ? "text-red-500" : "text-gray-400"}`}>
                    {formatTimer(timer)}
                  </span>
                )}
              </div>
              <button type="button" onClick={handleVerifyOtp}
                disabled={verifyLoading || timer === 0}
                className="shrink-0 px-4 py-3 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[#014A99] hover:bg-[#0057b8]">
                {verifyLoading ? "Verifying..." : "Verify"}
              </button>
            </div>
            {otpError && <p className="text-red-500 text-xs">{otpError}</p>}
            {timer === 0 && <p className="text-red-500 text-xs">The verification code has expired. Please click Resend.</p>}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <input name="region" value={form.region} onChange={handleChange} placeholder="Desired Territory *  e.g. Southern Gyeonggi, Chungcheong region"
          className={errors.region ? ERROR_CLS : INPUT_CLS} />
        {errors.region && <p className="text-red-500 text-xs">{errors.region}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-700 font-medium">Do you need installation crew support?</p>
        <div className="flex gap-3">
          {[
            { value: "yes", label: "Yes, needed" },
            { value: "no",  label: "Have our own crew" },
            { value: "undecided", label: "Undecided" },
          ].map(opt => (
            <label key={opt.value}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm cursor-pointer transition-colors select-none
                ${form.needsCrew === opt.value
                  ? "border-[#014A99] bg-[#EBF2FF] text-[#014A99] font-medium"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
              <input type="radio" name="needsCrew" value={opt.value}
                checked={form.needsCrew === opt.value}
                onChange={handleChange} className="sr-only" />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <textarea name="message" value={form.message} onChange={handleChange} rows={4}
        placeholder="Feel free to write any additional questions here."
        className={`${INPUT_CLS} resize-none`} />

      <div className="flex flex-col gap-1">
        <div className="flex items-start gap-2 text-sm text-gray-500">
          <input type="checkbox" id="partnership-privacy" checked={agreed}
            onChange={e => { setAgreed(e.target.checked); setErrors(prev => ({ ...prev, agreed: "" })); }}
            className="mt-0.5 accent-[#014A99]" />
          <label htmlFor="partnership-privacy">
            I agree to the <span className="text-gray-700 font-medium">collection and use of personal information</span>. <span className="text-xs">(Required)</span>
          </label>
        </div>
        {errors.agreed && <p className="text-red-500 text-xs">{errors.agreed}</p>}
      </div>

      {status === "error" && <p className="text-red-500 text-sm">An error occurred. Please try again.</p>}

      <button type="submit" disabled={status === "loading" || !agreed || !emailVerified}
        className="w-full py-3.5 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[#014A99] hover:bg-[#0057b8]">
        {status === "loading" ? "Submitting..." : "Apply for Partnership"}
      </button>
    </form>
  );
}
