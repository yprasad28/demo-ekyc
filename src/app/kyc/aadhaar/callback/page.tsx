"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing your Aadhaar verification...");

  useEffect(() => {
    const savedToken = localStorage.getItem("kyc_token");
    const txnId = localStorage.getItem("digilocker_txnId");
    const code = searchParams.get("code");
    console.log("[Callback] Token:", !!savedToken, "txnId:", txnId, "code:", code);

    if (!savedToken || !txnId) {
      console.log("[Callback] Missing token or txnId, redirecting to register");
      setStatus("success");
      setMessage("Redirecting...");
      setTimeout(() => router.push("/kyc/register"), 1000);
      return;
    }

    if (!code) {
      console.log("[Callback] Missing code from DigiLocker redirect, redirecting to register");
      setStatus("success");
      setMessage("Redirecting...");
      setTimeout(() => router.push("/kyc/register"), 1000);
      return;
    }

    console.log("[Callback] Calling SSO eAadhaar API with txnId:", txnId, "code:", code);
    fetch("/api/kyc/aadhaar/sso-eaadhaar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${savedToken}`,
      },
      body: JSON.stringify({ txnId, code }),
    })
      .then((r) => r.json())
      .then((data) => {
        console.log("[Callback] eAadhaar response:", JSON.stringify({
          success: data.success,
          hasData: !!data.aadhaarData,
          name: data.aadhaarData?.name,
          error: data.error,
        }));
        if (data.success && data.aadhaarData?.name) {
          localStorage.removeItem("digilocker_txnId");
          setStatus("success");
          setMessage("Aadhaar verified successfully via DigiLocker!");
          setTimeout(() => router.push("/kyc/register"), 1500);
        } else {
          console.log("[Callback] eAadhaar failed:", data.error);
          localStorage.removeItem("digilocker_txnId");
          setStatus("error");
          setMessage(data.error || "Failed to fetch Aadhaar data. Please try again.");
        }
      })
      .catch((err) => {
        console.error("[Callback] Network error:", err);
        localStorage.removeItem("digilocker_txnId");
        setStatus("error");
        setMessage("Network error. Please try again.");
      });
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-surface rounded-2xl shadow-lg border border-surface-container p-8 text-center">
          {status === "loading" && (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <h1 className="text-lg font-bold text-on-background">Verifying Aadhaar</h1>
              <p className="text-sm text-secondary">{message}</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <h1 className="text-lg font-bold text-on-background">Verification Complete</h1>
              <p className="text-sm text-secondary">{message}</p>
              <p className="text-xs text-on-surface-variant">Redirecting to KYC form...</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 text-[32px]">error</span>
              </div>
              <h1 className="text-lg font-bold text-on-background">Verification Failed</h1>
              <p className="text-sm text-secondary">{message}</p>
              <div className="flex gap-3">
                <Link href="/kyc/register" className="btn-outline flex-1 text-center">
                  Back to KYC
                </Link>
                <Link href="/kyc/register" className="btn-primary flex-1 text-center">
                  Try Again
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DigiLockerCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
