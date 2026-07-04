"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FILLED, SubmitButton, GovBadge, InfoBanner, WarningBanner } from "@/components/kyc/ui";

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | "complete";

interface AadhaarData {
  name: string; dob: string; gender: string;
  address: string; maskedAadhaar: string; photo: string;
}
interface PanData {
  panNumber: string; name: string; dob: string;
  status: string; panType: string;
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-slide-up">
      <div className="flex items-center gap-3 px-5 py-3 bg-[#1e1e2e] text-white rounded-xl shadow-2xl border border-white/10 max-w-sm">
        <span className="material-symbols-outlined text-green-400 text-[20px]" style={FILLED}>sms</span>
        <div className="flex-1">
          <p className="text-[11px] text-white/60 font-semibold uppercase tracking-wider">OTP Delivered</p>
          <p className="text-base font-mono font-bold tracking-[0.3em]">{message}</p>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  );
}

// ─── Back Button ───────────────────────────────────────────────────────────────
function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="flex items-center gap-1 text-secondary text-sm mb-3 hover:text-primary transition-colors">
      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
      Back
    </button>
  );
}

// ─── Mock Data Helper ──────────────────────────────────────────────────────────
function MockDataHelper({ type }: { type: "aadhaar" | "pan" }) {
  const [open, setOpen] = useState(false);
  const aadhaarData = [
    { num: "123456789012", name: "Aarav Sharma", dob: "1990-05-15" },
    { num: "987654321098", name: "Priya Patel", dob: "1993-08-22" },
    { num: "111122223333", name: "Rahul Verma", dob: "1985-11-30" },
    { num: "444455556666", name: "Ananya Das", dob: "1995-04-12" },
    { num: "777788889999", name: "Amit Joshi", dob: "1988-02-28" },
  ];
  const panData = [
    { num: "ABCDE1234F", name: "AARAV SHARMA", dob: "1990-05-15" },
    { num: "XYZAB5678C", name: "PRIYA K PATEL", dob: "1993-08-22" },
    { num: "QWERB9012D", name: "RAHUL VERMA", dob: "1985-11-30" },
    { num: "PLMKO9876E", name: "ANANYA DAS", dob: "1995-04-12" },
    { num: "ASDFG4321H", name: "AMIT JOSHI", dob: "1988-02-28" },
  ];
  const data = type === "aadhaar" ? aadhaarData : panData;

  return (
    <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors">
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]" style={FILLED}>info</span>
          View Mock {type === "aadhaar" ? "Aadhaar" : "PAN"} Data
        </span>
        <span className="material-symbols-outlined text-[18px] transition-transform" style={{transform: open ? "rotate(180deg)" : "rotate(0)"}}>expand_more</span>
      </button>
      {open && (
        <div className="px-4 pb-3">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20">
                <th className="pb-1.5">{type === "aadhaar" ? "Aadhaar Number" : "PAN Number"}</th>
                <th className="pb-1.5">Name</th>
                <th className="pb-1.5">DOB</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="text-xs text-on-surface border-b border-outline-variant/10 last:border-0">
                  <td className="py-1.5 font-mono font-semibold">{row.num}</td>
                  <td className="py-1.5">{row.name}</td>
                  <td className="py-1.5 font-mono">{row.dob}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Top Navigation Bar ───────────────────────────────────────────────────────
function TopNav() {
  return (
    <header className="sticky top-0 z-50 glass-nav border-b border-outline-variant/20">
      <div className="flex justify-between items-center px-6 h-14">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[18px]" style={FILLED}>shield_person</span>
          </div>
          <span className="text-base font-bold text-primary">SecureKYC</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/kyc/register" className="text-sm font-semibold text-primary border-b-2 border-primary pb-0.5">Verify</Link>
          <a href="#" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">History</a>
          <a href="#" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">Support</a>
          <a href="#" className="text-sm font-semibold text-primary hover:opacity-80 transition-opacity">FAQs</a>
        </div>
      </div>
    </header>
  );
}

// ─── Step Hero Panel (Left Side) ─────────────────────────────────────────────
function StepHero({ step }: { step: Step }) {
  const heroData: Record<number, { title: string; desc: string; icon: string; badge: string; features: { icon: string; title: string; desc: string }[] }> = {
    1: {
      title: "Secure & Fast Entry",
      desc: "Verify your identity in less than 2 minutes. We leverage government-grade security protocols to protect your personal information.",
      icon: "smartphone",
      badge: "INFORMATION ENCRYPTED",
      features: [{ icon: "sms", title: "Instant OTP", desc: "Receive verification code instantly" }, { icon: "lock", title: "End-to-End Encryption", desc: "Your data is protected with 256-bit SSL" }],
    },
    2: {
      title: "OTP Verification",
      desc: "We use a 6-digit code to verify your identity. This ensures that only you can access your KYC application.",
      icon: "pin",
      badge: "OTP DELIVERED SECURELY",
      features: [{ icon: "timer", title: "30-second timer", desc: "Resend if not received" }, { icon: "shield", title: "Secure channel", desc: "Encrypted transmission" }],
    },
    3: {
      title: "Email Notifications",
      desc: "Provide your email to receive KYC updates, verification status, and your digital completion certificate.",
      icon: "mail",
      badge: "SECURE COMMUNICATION",
      features: [{ icon: "notifications", title: "Status updates", desc: "Real-time notifications" }, { icon: "description", title: "Digital receipt", desc: "Get your KYC certificate" }],
    },
    4: {
      title: "Consent & Authorization",
      desc: "Review and authorize SecureKYC to access your Aadhaar and PAN data as per RBI and MeitY guidelines.",
      icon: "gavel",
      badge: "LEGAL COMPLIANCE",
      features: [{ icon: "policy", title: "RBI compliant", desc: "Following regulatory norms" }, { icon: "verified_user", title: "UIDAI authorized", desc: "Government approved" }],
    },
    5: {
      title: "Verify your Aadhaar Details",
      desc: "Securely link your identity using UIDAI's encrypted gateway. Your data is encrypted using AES-256 standards.",
      icon: "fingerprint",
      badge: "DATA PRIVACY GUARANTEED",
      features: [{ icon: "fingerprint", title: "Biometric verification", desc: "UIDAI encrypted gateway" }, { icon: "lock", title: "AES-256 encryption", desc: "Bank-grade security" }],
    },
    6: {
      title: "Secure Identity Verification",
      desc: "Your data is processed through encrypted channels directly with the Income Tax Department's database.",
      icon: "credit_card",
      badge: "GOVERNMENT VERIFICATION PORTAL",
      features: [{ icon: "credit_card", title: "NSDL verification", desc: "Direct database access" }, { icon: "compare", title: "Name matching", desc: "Fuzzy matching algorithm" }],
    },
    7: {
      title: "Secure Document Upload",
      desc: "Securely verify your identity using the offline XML process. Your data is encrypted locally before being transmitted via our UIDAI authorized channels.",
      icon: "upload_file",
      badge: "GOVERNMENT GRADE SECURE VAULT",
      features: [{ icon: "lock", title: "256-bit AES encryption", desc: "Bank-grade protection" }, { icon: "verified_user", title: "UIDAI Approved Path", desc: "Official verification" }],
    },
  };

  if (step === "complete") return <CompleteHero />;
  const data = heroData[step as number];
  if (!data) return null;

  return (
    <div className="hidden lg:flex w-[45%] hero-gradient relative items-center justify-center p-10 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
          <span className="material-symbols-outlined text-primary text-[14px]" style={FILLED}>lock</span>
          <span className="text-[10px] font-bold text-primary tracking-wider">{data.badge}</span>
        </div>
        {/* Icon illustration - passport size */}
        <div className="relative rounded-2xl overflow-hidden shadow-xl border border-outline-variant/20 bg-white flex items-center justify-center w-40 h-52 mx-auto">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[40px]" style={FILLED}>{data.icon}</span>
          </div>
        </div>
        {/* Title + description */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-on-background leading-tight">{data.title}</h1>
          <p className="text-sm text-on-surface-variant leading-relaxed">{data.desc}</p>
        </div>
        {/* Features */}
        <div className="space-y-3">
          {data.features.map((f, i) => (
            <div key={i} className="flex items-start gap-3 bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-outline-variant/20">
              <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-[18px]" style={FILLED}>{f.icon}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">{f.title}</p>
                <p className="text-xs text-on-surface-variant">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Trust */}
        <div className="flex items-center gap-2 pt-2">
          <span className="material-symbols-outlined text-primary text-[14px]" style={FILLED}>lock</span>
          <span className="text-xs text-on-surface-variant">Bank-grade 256-bit AES encryption</span>
        </div>
      </div>
    </div>
  );
}

// ─── Complete Hero ────────────────────────────────────────────────────────────
function CompleteHero() {
  return (
    <div className="hidden lg:flex w-[45%] hero-gradient relative items-center justify-center p-10 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-green-500/5 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-sm space-y-5">
        <div className="relative rounded-2xl overflow-hidden shadow-xl border border-outline-variant/20 bg-white flex items-center justify-center py-10">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-green-600 text-[48px]" style={FILLED}>check_circle</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-on-background">Verification Complete!</h1>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Your identity has been verified. You now have full access to all banking features.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ step, totalSteps = 7 }: { step: Step; totalSteps?: number }) {
  const numStep = step === "complete" ? totalSteps : (step as number);
  const stepLabels = ["Mobile OTP", "Email", "Consent", "Aadhaar", "PAN", "Documents", "Complete"];

  return (
    <div className="px-6 py-4 border-b border-outline-variant/10">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-primary">
          Step {step === "complete" ? "7" : numStep} of {totalSteps}
        </span>
        <span className="text-xs font-semibold text-on-surface-variant">
          {step === "complete" ? "Verification Complete" : stepLabels[numStep - 1]}
        </span>
      </div>
      <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
        <div
          className="h-1.5 bg-primary rounded-full transition-all duration-500"
          style={{ width: `${(numStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <div className="flex flex-col items-center gap-3 pt-6 pb-4">
      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
        <span className="material-symbols-outlined text-[12px]" style={FILLED}>lock</span>
        Bank-grade encryption
      </div>
      <div className="flex gap-4 text-xs text-on-surface-variant">
        <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
        <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
      </div>
      <p className="text-[10px] text-on-surface-variant">© 2024 SecureKYC. Bank-grade 256-bit encryption.</p>
    </div>
  );
}

// ─── Step 1: Mobile Entry ─────────────────────────────────────────────────────
function StepMobile({ onNext, onShowOtp }: { onNext: (mobile: string) => void; onShowOtp: (otp: string) => void }) {
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async () => {
    if (!/^[0-9]{10}$/.test(mobile)) { setError("Please enter a valid 10-digit mobile number."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/customer-login", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to send OTP."); setLoading(false); return; }
      if (data.otp) onShowOtp(data.otp);
      onNext(mobile);
    } catch { setError("Network error. Please try again."); }
    setLoading(false);
  };

  return (
    <div className="space-y-5 animate-slide-up" onKeyDown={(e) => { if (e.key === "Enter" && !loading && /^[0-9]{10}$/.test(mobile)) handleSendOtp(); }}>
      <div>
        <h2 className="text-lg font-bold text-on-background">Mobile Number</h2>
        <p className="text-sm text-secondary mt-1">Enter 10 digit mobile number</p>
      </div>
      <div>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <span className="text-sm font-semibold text-on-surface-variant">+91</span>
            <div className="w-px h-4 bg-outline-variant ml-1" />
          </div>
          <input
            className="input-field pl-16"
            type="tel"
            maxLength={10}
            placeholder="Enter 10 digit mobile number"
            value={mobile}
            onChange={(e) => { setMobile(e.target.value.replace(/\D/g,"")); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
          />
        </div>
        {error && <p className="text-xs text-error mt-1.5">{error}</p>}
      </div>
      <p className="text-xs text-on-surface-variant">
        By continuing, you agree to our <a href="#" className="text-primary font-semibold">Privacy Policy</a> and <a href="#" className="text-primary font-semibold">Terms of Service</a>.
      </p>
      <SubmitButton loading={loading} onClick={handleSendOtp} disabled={loading || !/^[0-9]{10}$/.test(mobile)} icon="arrow_forward">
        Get OTP
      </SubmitButton>
      <div className="flex items-center justify-center gap-6 pt-4">
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[14px] text-primary" style={FILLED}>lock</span>
          BANK-GRADE SECURITY
        </div>
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[14px] text-primary" style={FILLED}>verified_user</span>
          UIDAI CERTIFIED
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: OTP Verification ─────────────────────────────────────────────────
function StepOTP({ mobile, onNext, onBack, onShowOtp }: { mobile: string; onNext: () => void; onBack: () => void; onShowOtp: (otp: string) => void }) {
  const [otpDigits, setOtpDigits] = useState(["","","","","",""]);
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setInterval(() => setTimer(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const handleChange = (val: string, idx: number) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...otpDigits]; next[idx] = val;
    setOtpDigits(next);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === "ArrowLeft" && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) refs.current[idx + 1]?.focus();
    if (e.key === "Enter") handleVerify();
  };

  const handleVerify = async () => {
    const otp = otpDigits.join("");
    if (otp.length !== 6) { setError("Please enter the complete 6-digit OTP."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ mobile, otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invalid OTP."); setLoading(false); return; }
      localStorage.setItem("kyc_token", data.token);
      onNext();
    } catch { setError("Network error. Please try again."); }
    setLoading(false);
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setResending(true);
    try {
      const res = await fetch("/api/auth/customer-login", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (data.otp) onShowOtp(data.otp);
      setTimer(30); setOtpDigits(["","","","","",""]);
    } catch { setError("Failed to resend OTP."); }
    setResending(false);
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <BackButton onBack={onBack} />
        <h2 className="text-lg font-bold text-on-background">Verify your number</h2>
        <p className="text-sm text-secondary mt-1">We&apos;ll send a 6-digit code to +91 •••••• ••{mobile.slice(-2)} to verify it&apos;s you</p>
      </div>
      <div>
        <div className="flex justify-center gap-3">
          {otpDigits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              className="otp-box"
              type="tel"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(e.target.value, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
            />
          ))}
        </div>
        {error && <p className="text-xs text-error text-center mt-2">{error}</p>}
      </div>
      <SubmitButton loading={loading} onClick={handleVerify} disabled={loading} icon="verified">
        Verify
      </SubmitButton>
      <div className="flex items-center justify-center gap-2 text-sm">
        <span className="text-secondary">Didn&apos;t receive the code?</span>
        {timer > 0 ? (
          <span className="text-secondary">Resend OTP in <strong className="text-primary">{timer}s</strong></span>
        ) : (
          <button onClick={handleResend} disabled={resending} className="text-primary font-semibold hover:opacity-80 transition-opacity">
            {resending ? "Sending..." : "Resend OTP"}
          </button>
        )}
      </div>
      <div className="flex items-center justify-center gap-4 pt-4">
        <span className="flex items-center gap-1 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[12px]" style={FILLED}>lock</span>
          Bank-grade encryption
        </span>
        <span className="text-xs text-on-surface-variant">UIDAI COMPLIANT</span>
        <span className="text-xs text-on-surface-variant">MEITY SECURED</span>
      </div>
    </div>
  );
}

// ─── Step 3: Email ────────────────────────────────────────────────────────────
function StepEmail({ token, onNext, onBack }: { token: string; onNext: () => void; onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleNext = async () => {
    if (!valid) { setError("Please enter a valid email address."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/kyc/save-step", {
        method: "POST",
        headers: {"Content-Type":"application/json","Authorization":`Bearer ${token}`},
        body: JSON.stringify({ step: 3, data: { email } }),
      });
      if (!res.ok) { setError("Failed to save email. Please try again."); setLoading(false); return; }
      onNext();
    } catch { setError("Network error. Please try again."); }
    setLoading(false);
  };

  return (
    <div className="space-y-5 animate-slide-up" onKeyDown={(e) => { if (e.key === "Enter" && !loading && valid) handleNext(); }}>
      <div>
        <BackButton onBack={onBack} />
        <h2 className="text-lg font-bold text-on-background">Email Address</h2>
        <p className="text-sm text-secondary mt-1">For KYC notifications and communication</p>
      </div>
      <div>
        <label className="input-label">Email Address</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-on-surface-variant">mail</span>
          <input className="input-field pl-10" type="email" placeholder="you@example.com" value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }} />
          {valid && <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-green-600 text-[20px]" style={FILLED}>check_circle</span>}
        </div>
        {error && <p className="text-xs text-error mt-1.5">{error}</p>}
      </div>
      <SubmitButton loading={loading} onClick={handleNext} disabled={loading || !valid} icon="arrow_forward">
        Continue
      </SubmitButton>
    </div>
  );
}

// ─── Step 4: Consent ──────────────────────────────────────────────────────────
function StepConsent({ token, onNext, onBack }: { token: string; onNext: () => void; onBack: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!agreed) return;
    setLoading(true);
    try {
      await fetch("/api/kyc/save-step", {
        method: "POST",
        headers: {"Content-Type":"application/json","Authorization":`Bearer ${token}`},
        body: JSON.stringify({ step: 4, data: { consent: true, consentTimestamp: new Date().toISOString() } }),
      });
      onNext();
    } catch {}
    setLoading(false);
  };

  return (
    <div className="space-y-5 animate-slide-up" onKeyDown={(e) => { if (e.key === "Enter" && !loading && agreed) handleNext(); }}>
      <div>
        <BackButton onBack={onBack} />
        <h2 className="text-lg font-bold text-on-background">Consent & Authorization</h2>
        <p className="text-sm text-secondary mt-1">Please review and accept the terms</p>
      </div>
      <div className="card space-y-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-[24px]" style={FILLED}>gavel</span>
          <div>
            <p className="font-semibold text-sm text-on-surface mb-2">I hereby authorize SecureKYC to:</p>
            <ul className="text-xs text-on-surface-variant space-y-1.5 list-disc list-inside">
              <li>Access my Aadhaar data from UIDAI via e-KYC</li>
              <li>Verify my PAN details from NSDL records</li>
              <li>Store and process my KYC information for banking compliance</li>
              <li>Share anonymized data with the bank for onboarding purposes</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border-input pt-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" className="mt-1 w-4 h-4 rounded border-border-input accent-primary" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span className="text-xs text-on-surface-variant">
              I agree to the <a href="#" className="text-primary font-semibold">Terms and Conditions</a> and{" "}
              <a href="#" className="text-primary font-semibold">Privacy Policy</a>. I consent to digital KYC verification.{" "}
              <span className="text-[10px] text-outline">({new Date().toLocaleString()})</span>
            </span>
          </label>
        </div>
      </div>
      <SubmitButton loading={loading} onClick={handleNext} disabled={loading || !agreed} icon="check_circle">
        I Agree & Continue
      </SubmitButton>
    </div>
  );
}

// ─── Step 5: Aadhaar Verification (with tabs) ────────────────────────────────
function StepAadhaar({ token, onNext, onBack, onShowOtp }: { token: string; onNext: (data: AadhaarData) => void; onBack: () => void; onShowOtp: (otp: string) => void }) {
  // back button rendered inside the return
  const [activeTab, setActiveTab] = useState<"manual" | "xml" | "qr">("manual");
  const [aadhaar, setAadhaar] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["","","","","",""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(0);
  const [consent, setConsent] = useState(false);
  const refs = useRef<(HTMLInputElement|null)[]>([]);
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [shareCode, setShareCode] = useState("");
  const [xmlError, setXmlError] = useState("");

  const formatAadhaar = (v: string) => {
    const digits = v.replace(/\D/g,"").slice(0,12);
    return digits.replace(/(.{4})/g,"$1 ").trim();
  };

  useEffect(() => {
    if (timer <= 0) return;
    const t = setInterval(() => setTimer(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const handleSendOtp = async () => {
    const cleanNum = aadhaar.replace(/\s/g,"");
    if (cleanNum.length !== 12) { setError("Please enter a valid 12-digit Aadhaar number."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/kyc/aadhaar/otp-send", {
        method: "POST",
        headers: {"Content-Type":"application/json","Authorization":`Bearer ${token}`},
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to send OTP."); setLoading(false); return; }
      if (data.otp) onShowOtp(data.otp);
      setOtpSent(true); setTimer(30);
    } catch { setError("Network error."); }
    setLoading(false);
  };

  const handleVerify = async () => {
    const otp = otpDigits.join("");
    if (otp.length !== 6) { setError("Please enter the complete 6-digit OTP."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/kyc/aadhaar/otp-verify", {
        method: "POST",
        headers: {"Content-Type":"application/json","Authorization":`Bearer ${token}`},
        body: JSON.stringify({ otp, aadhaarNumber: aadhaar.replace(/\s/g,"") }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Verification failed."); setLoading(false); return; }
      onNext(data.aadhaarData);
    } catch { setError("Network error."); }
    setLoading(false);
  };

  const handleOtpChange = (val: string, idx: number) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...otpDigits]; next[idx] = val;
    setOtpDigits(next);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  };

  const tabs = [
    { key: "manual" as const, label: "Manual Entry" },
    { key: "xml" as const, label: "XML Upload" },
    { key: "qr" as const, label: "QR Scan" },
  ];

  return (
    <div className="space-y-5 animate-slide-up" onKeyDown={(e) => { if (e.key === "Enter" && !loading && activeTab === "manual" && !otpSent && consent) handleSendOtp(); }}>
      <div>
        <BackButton onBack={onBack} />
        <h2 className="text-lg font-bold text-on-background">Verify your Aadhaar Details</h2>
        <p className="text-sm text-secondary mt-1">Securely link your identity using UIDAI&apos;s encrypted gateway. Choose your preferred method to proceed with Aadhaar authentication.</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface-container rounded-xl p-1 gap-1">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.key ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-low"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Manual Entry */}
      {activeTab === "manual" && (
        <div className="space-y-4">
          {!otpSent ? (
            <>
              <div>
                <label className="input-label">Aadhaar Number</label>
                <input className="input-field font-mono text-lg tracking-widest" type="text" maxLength={14}
                  placeholder="0000 0000 0000" value={aadhaar}
                  onChange={(e) => { setAadhaar(formatAadhaar(e.target.value)); setError(""); }} />
                <p className="text-[11px] text-on-surface-variant mt-1">Enter the 12-digit number on your Aadhaar</p>
                {error && <p className="text-xs text-error mt-1.5">{error}</p>}
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 w-4 h-4 rounded border-border-input accent-primary" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span className="text-xs text-on-surface-variant">
                  I hereby provide my voluntary consent to SecureKYC to use my Aadhaar number/Virtual ID to fetch my demographic information using OTP verification. I understand this data will be handled as per the <a href="#" className="text-primary font-semibold">Privacy Policy</a>.
                </span>
              </label>
              <MockDataHelper type="aadhaar" />
              <SubmitButton loading={loading} onClick={handleSendOtp} disabled={loading || !consent} icon="arrow_forward">
                Verify & Proceed
              </SubmitButton>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-secondary mb-3">Enter OTP sent to your Aadhaar-registered mobile</p>
                <div className="flex justify-center gap-3">
                  {otpDigits.map((d, i) => (
                    <input key={i} ref={el => { refs.current[i] = el; }} className="otp-box" type="tel" maxLength={1} value={d}
                      onChange={(e) => handleOtpChange(e.target.value, i)}
                      onKeyDown={(e) => { if(e.key==="Backspace"&&!otpDigits[i]&&i>0) refs.current[i-1]?.focus(); }} />
                  ))}
                </div>
                {error && <p className="text-xs text-error text-center mt-2">{error}</p>}
                <div className="flex items-center justify-center gap-2 text-sm mt-2">
                  {timer > 0 ? (
                    <span className="text-secondary">Resend OTP in <strong className="text-primary">{timer}s</strong></span>
                  ) : (
                    <button onClick={handleSendOtp} disabled={loading} className="text-primary font-semibold hover:opacity-80 transition-opacity">
                      {loading ? "Sending..." : "Resend OTP"}
                    </button>
                  )}
                </div>
              </div>
              <SubmitButton loading={loading} onClick={handleVerify} disabled={loading} icon="arrow_forward">
                Verify & Proceed
              </SubmitButton>
            </>
          )}
          <p className="text-xs text-center text-primary">Having trouble? <a href="#" className="font-semibold">Contact Support</a></p>
        </div>
      )}

      {/* XML Upload */}
      {activeTab === "xml" && (
        <div className="space-y-4">
          <div>
            <label className="input-label">Upload Document</label>
            <p className="text-xs text-on-surface-variant mb-2">Please provide your offline Aadhaar XML file and share code.</p>
            <label className="upload-zone cursor-pointer block">
              <input type="file" className="hidden" accept=".xml" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) { setXmlError("File size must be under 5MB."); setXmlFile(null); return; }
                setXmlError(""); setXmlFile(file);
              }} />
              <div className="flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[36px]">upload_file</span>
                <p className="text-sm font-semibold text-on-surface">{xmlFile ? xmlFile.name : "Click to upload or drag & drop"}</p>
                <p className="text-xs text-on-surface-variant">Aadhaar XML File (Max 5MB)</p>
              </div>
            </label>
          </div>
          <div>
            <label className="input-label">4-Digit Share Code</label>
            <input className="input-field font-mono tracking-widest" type="text" maxLength={4} placeholder="e.g. 1234"
              value={shareCode} onChange={(e) => setShareCode(e.target.value.replace(/\D/g,""))} />
            {xmlError && <p className="text-xs text-error mt-1.5">{xmlError}</p>}
          </div>
          <button className="btn-primary" disabled={!xmlFile || shareCode.length !== 4}>
            Verify XML<span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </div>
      )}

      {/* QR Scan */}
      {activeTab === "qr" && (
        <div className="space-y-4">
          <div className="upload-zone">
            <div className="flex flex-col items-center gap-3">
              <div className="w-48 h-48 bg-surface-container rounded-xl flex items-center justify-center border-2 border-dashed border-primary/30 relative">
                <span className="material-symbols-outlined text-primary text-[48px]">qr_code_scanner</span>
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Live Camera
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-on-surface">Center the QR code within the frame</p>
                <p className="text-xs text-on-surface-variant">Ensure the room is well-lit for optimal detection speed</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4">
            <span className="flex items-center gap-1 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[12px]" style={FILLED}>lock</span>
              Bank-grade 256-bit encryption
            </span>
            <GovBadge label="DIGITAL INDIA" />
          </div>
          <button className="btn-primary">Scan Now<span className="material-symbols-outlined text-[20px]">arrow_forward</span></button>
          <p className="text-xs text-center text-primary">Try Manual Entry</p>
        </div>
      )}

      <InfoBanner color="green" icon="verified_user">
        <p className="text-xs font-medium text-green-700">Data Privacy Guaranteed — Your data is encrypted using AES-256 standards.</p>
      </InfoBanner>
    </div>
  );
}

// ─── Step 5b: Review Aadhaar ──────────────────────────────────────────────────
function StepReviewAadhaar({ aadhaarData, token, onNext, onBack }: { aadhaarData: AadhaarData; token: string; onNext: () => void; onBack: () => void }) {
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(aadhaarData.name);
  const [address, setAddress] = useState(aadhaarData.address);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!name.trim()) { setError("Name cannot be empty."); return; }
    if (!address.trim()) { setError("Address cannot be empty."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/kyc/save-step", {
        method: "POST",
        headers: {"Content-Type":"application/json","Authorization":`Bearer ${token}`},
        body: JSON.stringify({ step: 5 }),
      });
      if (!res.ok) { setError("Failed to save. Please try again."); setLoading(false); return; }
      onNext();
    } catch { setError("Network error. Please try again."); }
    setLoading(false);
  };

  return (
    <div className="space-y-5 animate-slide-up" onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleConfirm(); }}>
      <div>
        <BackButton onBack={onBack} />
        <h2 className="text-lg font-bold text-on-background">Confirm Your Information</h2>
        <p className="text-sm text-secondary mt-1">We&apos;ve extracted these details from your Aadhaar card. Please confirm to proceed. We strictly ensure bank-grade security standards.</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-100">
          <span className="material-symbols-outlined text-green-600 text-[14px]" style={FILLED}>check_circle</span>
          <span className="text-xs font-semibold text-green-700">RESULT STATUS</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
          <span className="material-symbols-outlined text-blue-600 text-[14px]" style={FILLED}>verified_user</span>
          <span className="text-xs font-semibold text-blue-700">Verified Document Source</span>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-lowest rounded-lg border border-outline-variant/20">
        <span className="material-symbols-outlined text-primary text-[14px]" style={FILLED}>lock</span>
        <span className="text-xs font-semibold text-on-surface-variant">SECURITY</span>
        <span className="text-xs text-on-surface-variant ml-1">Bank-grade encryption</span>
      </div>
      <div className="card space-y-4">
        <div className="flex items-center gap-4">
          <img src={aadhaarData.photo} alt="Aadhaar Photo" className="w-20 h-20 rounded-full border-2 border-primary/20 object-cover" />
          <div className="flex-1">
            {editMode ? (
              <input className="input-field text-sm py-1 h-auto" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
            ) : (
              <p className="font-bold text-on-surface">{name}</p>
            )}
            <p className="text-xs text-on-surface-variant">Verified Aadhaar Card</p>
          </div>
        </div>
        <div className="mx-auto"><GovBadge /></div>
        <div className="border-t border-border-input pt-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">badge</span>
            <div>
              <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">Masked Aadhaar</p>
              <p className="text-sm font-medium text-on-surface">{aadhaarData.maskedAadhaar}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">home</span>
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">Address</p>
              {editMode ? (
                <textarea className="input-field text-sm py-2 h-auto resize-none w-full mt-1" rows={2} maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} />
              ) : (
                <p className="text-sm font-medium text-on-surface">{address}</p>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => setEditMode(!editMode)} className="text-xs text-primary font-semibold flex items-center gap-1 mx-auto">
          <span className="material-symbols-outlined text-[14px]">{editMode ? "save" : "edit"}</span>
          {editMode ? "Save Changes" : "Tap here if address/details are different"}
        </button>
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
      <SubmitButton loading={loading} onClick={handleConfirm} disabled={loading} icon="arrow_forward">
        Confirm & Proceed
      </SubmitButton>
      <p className="text-xs text-center text-on-surface-variant">By clicking, you consent to validating these details with the verification authority.</p>
    </div>
  );
}

// ─── Step 6: PAN Verification (with tabs) ────────────────────────────────────
function StepPAN({ token, onNext, onBack }: { token: string; aadhaarName: string; onNext: (data: PanData, score: number, dobMatch: boolean) => void; onBack: () => void }) {
  const [pan, setPan] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [ocrRunning, setOcrRunning] = useState(false);

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const panValid = panRegex.test(pan.toUpperCase());

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("File size must be under 5MB."); return; }
    setError("");
    setUploadedFile(file);
    setOcrRunning(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "PAN");
      await fetch("/api/kyc/upload", { method: "POST", headers: {"Authorization": `Bearer ${token}`}, body: formData });
      const panMatch = file.name.toUpperCase().match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/);
      if (panMatch) setPan(panMatch[0]);
    } catch {}
    setOcrRunning(false);
  };

  const handleVerify = async () => {
    if (!panValid) { setError("Please enter a valid PAN number."); return; }
    if (!dob) { setError("Please select your date of birth."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/kyc/pan/verify", {
        method: "POST",
        headers: {"Content-Type":"application/json","Authorization":`Bearer ${token}`},
        body: JSON.stringify({ panNumber: pan.toUpperCase(), dob }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "PAN verification failed."); setLoading(false); return; }
      onNext(data.panData, data.matchScore, data.dobMatch);
    } catch { setError("Network error."); }
    setLoading(false);
  };

  return (
    <div className="space-y-5 animate-slide-up" onKeyDown={(e) => { if (e.key === "Enter" && !loading && panValid && dob) handleVerify(); }}>
      <div>
        <BackButton onBack={onBack} />
        <h2 className="text-lg font-bold text-on-background">Verify your PAN details</h2>
        <p className="text-sm text-secondary mt-1">Please provide your Permanent Account Number and Date of Birth as per your PAN Card.</p>
      </div>
      {/* Upload Card */}
      <div className="space-y-4">
        <label className="upload-zone cursor-pointer block">
          <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[36px]">{ocrRunning ? "progress_activity" : "upload_file"}</span>
            <p className="text-sm font-semibold text-on-surface">{ocrRunning ? "Uploading..." : "Upload PAN Card"}</p>
            <p className="text-xs text-on-surface-variant">JPG, PNG, PDF — Max 5MB</p>
          </div>
          {uploadedFile && !ocrRunning && (
            <p className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1 justify-center">
              <span className="material-symbols-outlined text-[16px]" style={FILLED}>check_circle</span>{uploadedFile.name}
            </p>
          )}
        </label>
      </div>
      <div className="space-y-4">
        <div>
          <label className="input-label">PAN Number</label>
          <div className="relative">
            <input className={`input-field uppercase font-mono tracking-widest pr-10 ${pan && !panValid ? "border-error" : pan && panValid ? "border-green-500" : ""}`}
              type="text" maxLength={10} placeholder="ABCDE1234F" value={pan}
              onChange={(e) => { setPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"")); setError(""); }} />
            {pan && panValid && <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-green-600 text-[20px]" style={FILLED}>check_circle</span>}
          </div>
          <p className="text-[11px] text-on-surface-variant mt-1">Format: 5 letters, 4 numbers, 1 letter | e.g. ABCDE1234F</p>
        </div>
        <div>
          <label className="input-label">Date of Birth</label>
          <input className="input-field" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          <p className="text-[11px] text-on-surface-variant mt-1">As mentioned in your official PAN card</p>
        </div>
        <MockDataHelper type="pan" />
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
      <SubmitButton loading={loading} onClick={handleVerify} disabled={loading || !panValid || !dob} icon="arrow_forward">
        Verify & Proceed
      </SubmitButton>
      <div className="flex items-start gap-2 p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/20">
        <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">info</span>
        <p className="text-xs text-on-surface-variant">Ensure the card is clearly visible and well-lit. Reflection or blur may cause verification failure.</p>
      </div>
    </div>
  );
}

// ─── Step 6b: Name Match ──────────────────────────────────────────────────────
function StepNameMatch({ panData, matchScore, aadhaarName, token, onNext, onBack, dobMatch = true }: { panData: PanData; matchScore: number; aadhaarName: string; token: string; onNext: () => void; onBack: () => void; dobMatch?: boolean }) {
  const [loading, setLoading] = useState(false);
  const isGoodMatch = matchScore >= 60;

  const handleConfirm = async () => {
    if (!isGoodMatch) return;
    setLoading(true);
    await fetch("/api/kyc/save-step", {
      method: "POST",
      headers: {"Content-Type":"application/json","Authorization":`Bearer ${token}`},
      body: JSON.stringify({ step: 6 }),
    });
    setLoading(false);
    onNext();
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <BackButton onBack={onBack} />
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div className="w-28 h-28 rounded-full border-4 border-primary/20 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <span className={`text-3xl font-bold ${isGoodMatch ? "text-primary" : "text-red-500"}`}>{matchScore}%</span>
            </div>
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-on-primary text-[10px] font-bold rounded-full">
            {isGoodMatch ? "HIGH CONFIDENCE MATCH" : "LOW MATCH"}
          </div>
        </div>
        <h2 className="text-lg font-bold text-on-background">Match Score</h2>
        <p className="text-xs text-on-surface-variant mt-1">NAME MATCHING RESULT</p>
      </div>
      <div className="card space-y-4">
        <div className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-xl">
          <span className="material-symbols-outlined text-blue-600 text-[20px]">fingerprint</span>
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-on-surface-variant uppercase">Aadhaar Name</p>
            <p className="text-sm font-bold text-on-surface">{aadhaarName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-xl">
          <span className="material-symbols-outlined text-orange-600 text-[20px]">credit_card</span>
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-on-surface-variant uppercase">PAN Name</p>
            <p className="text-sm font-bold text-on-surface">{panData.name}</p>
          </div>
        </div>
      </div>
      {!isGoodMatch && (
        <WarningBanner
          title="Name Mismatch Warning"
          message="A slight difference in naming was detected but successfully resolved through our fuzzy matching algorithm."
          icon="warning"
        />
      )}
      {!dobMatch && (
        <WarningBanner
          title="Date of Birth Mismatch"
          message="The date of birth you entered does not match our records. Please verify and try again."
          icon="error"
        />
      )}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[14px] text-primary" style={FILLED}>lock</span>
          Biometric data safe
        </div>
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[14px] text-green-600" style={FILLED}>verified</span>
          License Check
        </div>
      </div>
      <SubmitButton loading={loading} onClick={handleConfirm} disabled={loading || !isGoodMatch} icon="arrow_forward">
        Proceed to Next Step
      </SubmitButton>
      <p className="text-xs text-center text-on-surface-variant">By clicking proceed, you agree to finalize your identity data.</p>
    </div>
  );
}

// ─── Step 7: Document Upload ──────────────────────────────────────────────────
function StepDocuments({ token, onNext, onBack }: { token: string; onNext: () => void; onBack: () => void }) {
  const docTypes = [
    { key: "AADHAAR", label: "Aadhaar Card", icon: "contact_page", required: true },
    { key: "PAN", label: "PAN Card", icon: "credit_card", required: true },
    { key: "PHOTO", label: "Passport Photo", icon: "face", required: true },
    { key: "SIGNATURE", label: "Signature", icon: "draw", required: false },
  ];
  const [uploads, setUploads] = useState<Record<string, { url: string; name: string; progress: number }>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (type: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) { return; }
    setUploading(prev => ({ ...prev, [type]: true }));
    setUploads(prev => ({ ...prev, [type]: { url: "", name: file.name, progress: 0 } }));
    const interval = setInterval(() => {
      setUploads(prev => ({ ...prev, [type]: { ...prev[type], progress: Math.min((prev[type]?.progress || 0) + 15, 90) } }));
    }, 150);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      const res = await fetch("/api/kyc/upload", { method: "POST", headers: {"Authorization": `Bearer ${token}`}, body: formData });
      const data = await res.json();
      clearInterval(interval);
      if (res.ok) {
        const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
        setUploads(prev => ({ ...prev, [type]: { url: previewUrl || data.document.fileUrl, name: file.name, progress: 100 } }));
      }
    } catch { clearInterval(interval); }
    setUploading(prev => ({ ...prev, [type]: false }));
  };

  const requiredDone = docTypes.filter(d => d.required).every(d => uploads[d.key]?.progress === 100);

  const handleSubmit = async () => {
    setLoading(true);
    await fetch("/api/kyc/save-step", {
      method: "POST",
      headers: {"Content-Type":"application/json","Authorization":`Bearer ${token}`},
      body: JSON.stringify({ step: 7 }),
    });
    setLoading(false);
    onNext();
  };

  return (
    <div className="space-y-5 animate-slide-up" onKeyDown={(e) => { if (e.key === "Enter" && !loading && requiredDone) handleSubmit(); }}>
      <div>
        <BackButton onBack={onBack} />
        <h2 className="text-lg font-bold text-on-background">Upload Documents</h2>
        <p className="text-sm text-secondary mt-1">Upload clear copies of your documents</p>
      </div>
      <div className="space-y-4">
        {docTypes.map((doc) => {
          const up = uploads[doc.key];
          const isUploading = uploading[doc.key];
          const isDone = up?.progress === 100;
          return (
            <div key={doc.key} className="card">
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-primary text-[22px]" style={FILLED}>{doc.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-on-surface">{doc.label}</p>
                  <p className="text-xs text-on-surface-variant">{doc.required ? "Required" : "Optional"}</p>
                </div>
                {isDone && <span className="material-symbols-outlined text-green-600 text-[24px]" style={FILLED}>check_circle</span>}
              </div>
              {isDone && up ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                  {up.url && up.url.startsWith("blob:") ? (
                    <img src={up.url} alt={doc.label} className="w-10 h-10 rounded-lg object-cover border border-border-input" />
                  ) : (
                    <span className="material-symbols-outlined text-green-600 text-[32px]" style={FILLED}>{doc.icon}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-green-700 truncate">{up.name}</p>
                    <p className="text-[11px] text-green-600">Uploaded successfully</p>
                  </div>
                  <label className="cursor-pointer text-xs text-primary font-semibold hover:opacity-70">
                    Change
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => e.target.files?.[0] && handleFileUpload(doc.key, e.target.files[0])} />
                  </label>
                </div>
              ) : (
                <label className="upload-zone cursor-pointer block">
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => e.target.files?.[0] && handleFileUpload(doc.key, e.target.files[0])} />
                  {isUploading ? (
                    <div className="space-y-2">
                      <p className="text-xs text-on-surface-variant">Uploading {up?.name}...</p>
                      <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                        <div className="h-1.5 bg-primary rounded-full transition-all duration-300" style={{ width: `${up?.progress || 0}%` }} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-[28px]">upload_file</span>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-on-surface">Click to upload</p>
                        <p className="text-xs text-on-surface-variant">JPG, PNG, PDF — max 5MB</p>
                      </div>
                    </div>
                  )}
                </label>
              )}
            </div>
          );
        })}
      </div>
      <SubmitButton loading={loading} onClick={handleSubmit} disabled={loading || !requiredDone} icon="send">
        Submit KYC Application
      </SubmitButton>
    </div>
  );
}

// ─── Step 8: KYC Complete ─────────────────────────────────────────────────────
function StepComplete() {
  return (
    <div className="space-y-6 animate-slide-up py-4">
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-on-primary text-[40px]" style={FILLED}>check_circle</span>
        </div>
        <h2 className="text-xl font-bold text-on-background mb-2">Verification Successful</h2>
        <p className="text-sm text-secondary max-w-sm mx-auto">
          Your identity has been verified. You now have full access to all banking features and higher transaction limits.
        </p>
      </div>
      {/* User Profile */}
      <div className="flex items-center gap-4 p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/20">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-[32px]" style={FILLED}>person</span>
        </div>
        <div className="flex-1">
          <p className="font-bold text-on-surface">Johnathan Doe</p>
          <p className="text-xs text-on-surface-variant">Verified Account Holder</p>
        </div>
        <GovBadge />
      </div>
      {/* Verified Documents */}
      <div className="card">
        <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]" style={FILLED}>verified</span>
          Verified Documents
        </h3>
        <div className="space-y-3">
          {[
            { icon: "contact_page", label: "National ID Card", sub: "Aadhaar Verification" },
            { icon: "credit_card", label: "PAN Card", sub: "Income Tax Department" },
            { icon: "face", label: "Biometric Face Scan", sub: "Liveness Check Passed" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/20">
              <span className="material-symbols-outlined text-primary text-[20px]" style={FILLED}>{item.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-on-surface">{item.label}</p>
                <p className="text-[11px] text-on-surface-variant">{item.sub}</p>
              </div>
              <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[10px]" style={FILLED}>check</span>VERIFIED
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4 p-3 bg-primary/5 rounded-xl">
          <span className="material-symbols-outlined text-primary text-[16px]" style={FILLED}>lock</span>
          <p className="text-xs text-on-surface-variant">All data is stored with bank-grade AES-256 encryption.</p>
        </div>
      </div>
      <Link href="/" className="btn-primary">
        Go to Dashboard<span className="material-symbols-outlined text-[20px]">arrow_forward</span>
      </Link>
      <button className="btn-ghost w-full text-sm">Download Verification Receipt (PDF)</button>
      <Footer />
    </div>
  );
}

// ─── Main Wizard Page ─────────────────────────────────────────────────────────
export default function RegisterPage() {
  const [step, setStep] = useState<Step>(1);
  const [mobile, setMobile] = useState("");
  const [token, setToken] = useState("");
  const [aadhaarData, setAadhaarData] = useState<AadhaarData | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [panData, setPanData] = useState<PanData | null>(null);
  const [matchScore, setMatchScore] = useState(0);
  const [showMatch, setShowMatch] = useState(false);
  const [dobMatch, setDobMatch] = useState(true);
  const [toastOtp, setToastOtp] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("kyc_token");
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  const stepContent = () => {
    if (step === 1) return <StepMobile onNext={(mob) => { setMobile(mob); setStep(2); }} onShowOtp={(otp) => setToastOtp(otp)} />;
    if (step === 2) return <StepOTP mobile={mobile} onBack={() => setStep(1)} onNext={() => setStep(3)} onShowOtp={(otp) => setToastOtp(otp)} />;
    if (step === 3) return <StepEmail token={token} onBack={() => setStep(2)} onNext={() => setStep(4)} />;
    if (step === 4) return <StepConsent token={token} onBack={() => setStep(3)} onNext={() => setStep(5)} />;
    if (step === 5) {
      if (showReview && aadhaarData) return <StepReviewAadhaar aadhaarData={aadhaarData} token={token} onBack={() => setShowReview(false)} onNext={() => { setStep(6); setShowReview(false); }} />;
      return <StepAadhaar token={token} onBack={() => setStep(4)} onNext={(data) => { setAadhaarData(data); setShowReview(true); }} onShowOtp={(otp) => setToastOtp(otp)} />;
    }
    if (step === 6) {
      if (showMatch && panData) return <StepNameMatch panData={panData} matchScore={matchScore} aadhaarName={aadhaarData?.name || ""} token={token} onBack={() => setShowMatch(false)} onNext={() => { setStep(7); setShowMatch(false); }} dobMatch={dobMatch} />;
      return <StepPAN token={token} aadhaarName={aadhaarData?.name || ""} onBack={() => setStep(5)} onNext={(data, score, dobOk) => { setPanData(data); setMatchScore(score); setDobMatch(dobOk); setShowMatch(true); }} />;
    }
    if (step === 7) return <StepDocuments token={token} onBack={() => setStep(6)} onNext={() => setStep("complete")} />;
    return <StepComplete />;
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface lg:flex-row">
      {toastOtp && <Toast message={toastOtp} onClose={() => setToastOtp(null)} />}
      <StepHero step={step} />
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
        <TopNav />
        {step !== "complete" && <ProgressBar step={step} />}
        <main className="flex-1 flex flex-col items-center justify-start px-5 py-6 lg:py-8">
          <div className="w-full max-w-md mx-auto">
            {stepContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
