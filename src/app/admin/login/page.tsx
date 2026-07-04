"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@securekyc.in");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) { setError("Please enter email and password."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed."); setLoading(false); return; }
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_info", JSON.stringify(data.admin));
      router.push("/admin/dashboard");
    } catch { setError("Network error. Please try again."); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[22px]" style={{fontVariationSettings:"'FILL' 1"}}>shield_person</span>
            </div>
            <span className="text-xl font-bold text-primary">SecureKYC</span>
          </Link>
          <h1 className="text-headline-lg font-bold text-on-background">Admin Portal</h1>
          <p className="text-body-md text-secondary mt-1">Sign in to manage KYC applications</p>
        </div>

        {/* Login card */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-6 space-y-5">
          <div>
            <label className="input-label">Email Address</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-on-surface-variant">email</span>
              <input
                className="input-field pl-10"
                type="email"
                placeholder="admin@securekyc.in"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
          </div>
          <div>
            <label className="input-label">Password</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-on-surface-variant">lock</span>
              <input
                className="input-field pl-10 pr-10"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-[18px]">{showPass ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-error-container rounded-xl">
              <span className="material-symbols-outlined text-error text-[16px]">error</span>
              <p className="text-xs text-on-error-container">{error}</p>
            </div>
          )}
          <button className="btn-primary" onClick={handleLogin} disabled={loading}>
            {loading ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : <>Sign In<span className="material-symbols-outlined text-[20px]">login</span></>}
          </button>
          <div className="text-center text-xs text-on-surface-variant">
            <p>Demo credentials: <strong className="text-on-surface">admin@securekyc.in</strong> / <strong className="text-on-surface">Admin@1234</strong></p>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="trust-badge">
            <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings:"'FILL' 1"}}>lock</span>
            Bank-grade encryption
          </div>
          <div className="gov-badge">
            <div className="w-1.5 h-full tricolor-strip" />
            <span className="px-3 text-label-caps text-on-secondary-fixed-variant">MeitY COMPLIANT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
