"use client";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full">
      {/* Left Side: Hero Section */}
      <section className="hidden md:flex md:w-1/2 hero-gradient relative items-center justify-center p-xl overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-lg">
          <div className="aspect-square bg-surface-container-lowest rounded-2xl shadow-xl flex flex-col items-center justify-center p-xl border border-outline-variant/30 overflow-hidden">
            {/* Decorative KYC visual */}
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-28 h-28 bg-primary/10 rounded-full flex items-center justify-center">
                  <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[52px]" style={{fontVariationSettings:"'FILL' 1"}}>shield_person</span>
                  </div>
                </div>
                <div className="absolute -right-2 -top-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                  <span className="material-symbols-outlined text-white text-[16px]" style={{fontVariationSettings:"'FILL' 1"}}>verified</span>
                </div>
              </div>
              {/* Bento grid of feature icons */}
              <div className="grid grid-cols-3 gap-4 w-full px-4">
                {[
                  {icon:"fingerprint", label:"Biometric"},
                  {icon:"contact_page", label:"Aadhaar"},
                  {icon:"credit_card", label:"PAN"},
                  {icon:"lock", label:"Encrypted"},
                  {icon:"task_alt", label:"Verified"},
                  {icon:"phone_android", label:"Mobile OTP"},
                ].map((item) => (
                  <div key={item.icon} className="flex flex-col items-center gap-1.5 bg-lavender/80 rounded-xl p-3 hover-lift border border-border-input/50">
                    <span className="material-symbols-outlined text-primary text-2xl" style={{fontVariationSettings:"'FILL' 1"}}>{item.icon}</span>
                    <span className="text-[10px] font-semibold text-on-surface-variant">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 text-center space-y-2">
            <h2 className="text-headline-lg font-bold text-primary">Secure by Design</h2>
            <p className="text-body-md text-secondary max-w-md mx-auto">
              Your identity data is encrypted and processed following the highest regulatory standards. We never share your personal information.
            </p>
          </div>
        </div>
      </section>

      {/* Right Side: Content & Interaction */}
      <main className="flex-1 flex flex-col bg-surface-container-lowest">
        {/* Top Navigation */}
        <header className="sticky top-0 z-50 glass-nav flex justify-between items-center w-full px-5 h-14 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-container rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]" style={{fontVariationSettings:"'FILL' 1"}}>shield_person</span>
            </div>
            <span className="text-lg font-bold text-primary tracking-tight">SecureKYC</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/admin/login" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-lg border border-outline-variant/30 text-xs font-semibold text-on-surface-variant hover:text-primary hover:border-primary/40 transition-all">
              <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings:"'FILL' 1"}}>admin_panel_settings</span>
              Admin Panel
            </a>
            <a href="#faqs" className="text-sm font-semibold text-primary hover:opacity-80 transition-opacity">
              FAQs
            </a>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 max-w-lg mx-auto w-full">
          {/* Hero Header */}
          <div className="text-center mb-8 animate-slide-up">
            <h1 className="text-headline-lg font-bold text-on-background mb-2">Complete Your KYC</h1>
            <div className="flex items-center justify-center gap-3 text-secondary text-xs font-semibold">
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">lock</span>Secure</span>
              <span className="w-1 h-1 bg-outline-variant rounded-full" />
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">bolt</span>Fast</span>
              <span className="w-1 h-1 bg-outline-variant rounded-full" />
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">devices</span>100% Digital</span>
            </div>
          </div>

          {/* 4-Step Progress Indicator */}
          <div className="w-full mb-8 animate-slide-up" style={{animationDelay:"0.1s"}}>
            <div className="flex justify-between items-center relative">
              <div className="absolute top-4 left-0 w-full h-[2px] bg-surface-container -z-10" />
              {[
                {icon:"sms", label:"Mobile OTP", active:true},
                {icon:"badge", label:"PAN", active:false},
                {icon:"fingerprint", label:"Aadhaar", active:false},
                {icon:"task_alt", label:"Complete", active:false},
              ].map((step, i) => (
                <div key={i} className="progress-step">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${step.active ? "bg-primary-container text-on-primary step-active-ring" : "bg-surface-container text-on-surface-variant"}`}>
                    <span className="material-symbols-outlined text-[18px]">{step.icon}</span>
                  </div>
                  <span className={`text-[11px] font-semibold ${step.active ? "text-primary" : "text-on-surface-variant"}`}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What you need card */}
          <div className="w-full card mb-6 animate-slide-up" style={{animationDelay:"0.15s"}}>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary" style={{fontVariationSettings:"'FILL' 1"}}>list_alt</span>
              <h3 className="font-semibold text-base text-on-surface">What you&apos;ll need</h3>
            </div>
            <ul className="space-y-3">
              {[
                {icon:"credit_card", label:"PAN card", sub:"For identity verification"},
                {icon:"contact_page", label:"Aadhaar card", sub:"For address proof"},
                {icon:"smartphone", label:"Registered mobile", sub:"For OTP verification"},
              ].map((item) => (
                <li key={item.icon} className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-card hover-lift">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-tertiary-fixed flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-tertiary-fixed-variant text-[18px]">{item.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{item.label}</p>
                      <p className="text-xs text-on-surface-variant">{item.sub}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[#2e7d32]" style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="w-full space-y-3 animate-slide-up" style={{animationDelay:"0.2s"}}>
            <Link href="/kyc/register" className="btn-primary text-lg font-bold">
              Start Verification
              <span className="material-symbols-outlined text-[22px]">arrow_forward</span>
            </Link>
            <p className="text-center text-xs text-secondary font-medium">
              Takes less than 3 minutes to complete.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex flex-col items-center justify-center gap-3 w-full px-5 pb-6 mt-auto">
          <div className="trust-badge">
            <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings:"'FILL' 1"}}>lock</span>
            Bank-grade encryption
          </div>
          <div className="flex gap-4 text-on-surface-variant text-xs">
            <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
            <span className="text-outline-variant">|</span>
            <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
          </div>
          {/* India Gov Badge */}
          <div className="gov-badge">
            <div className="w-1.5 h-full tricolor-strip flex-shrink-0" />
            <span className="px-3 text-label-caps text-on-secondary-fixed-variant">MeitY COMPLIANT</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
