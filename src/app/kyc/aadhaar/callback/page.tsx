"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing your DigiLocker authentication...");

  useEffect(() => {
    const txnId = searchParams.get("decstro_txn_id") || searchParams.get("txn_id");
    const code = searchParams.get("code");

    if (!txnId && !code) {
      setStatus("error");
      setMessage("No transaction reference found. Please try again.");
      return;
    }

    const token = localStorage.getItem("kyc_token");
    if (!token) {
      setStatus("error");
      setMessage("Session expired. Please login again.");
      return;
    }

    const fetchEaadhaar = async () => {
      try {
        const res = await fetch("/api/kyc/aadhaar/digilocker/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            txnId: txnId || code,
            aadhaarNumber: "",
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setStatus("error");
          setMessage(data.error || "Failed to verify Aadhaar. Please try again.");
          return;
        }

        setStatus("success");
        setMessage("Aadhaar verified successfully via DigiLocker!");
        setTimeout(() => {
          router.push("/kyc/register");
        }, 2000);
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again.");
      }
    };

    fetchEaadhaar();
  }, [searchParams, router]);

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
