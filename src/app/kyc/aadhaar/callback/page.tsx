"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const POLL_INTERVAL = 2000;
const MAX_POLLS = 15;

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing your Aadhaar verification...");

  useEffect(() => {
    const savedToken = localStorage.getItem("kyc_token");
    const txnId = localStorage.getItem("digilocker_txnId");

    if (!savedToken) {
      setStatus("success");
      setMessage("Redirecting...");
      setTimeout(() => router.push("/kyc/register"), 1000);
      return;
    }

    const refId = searchParams.get("reference_id") || searchParams.get("referenceId") || txnId;

    let polls = 0;

    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/kyc/aadhaar/fetch-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${savedToken}`,
          },
          body: JSON.stringify({ referenceId: refId }),
        });
        const data = await res.json();

        if (data.found) {
          clearInterval(timer);
          localStorage.removeItem("digilocker_txnId");
          setStatus("success");
          setMessage("Aadhaar verified successfully via DigiLocker!");
          setTimeout(() => router.push("/kyc/register"), 1500);
          return;
        }

        polls++;
        if (polls >= MAX_POLLS) {
          clearInterval(timer);
          localStorage.removeItem("digilocker_txnId");
          setStatus("error");
          setMessage("Verification is taking longer than expected. Please go back and try again.");
        }
      } catch {
        polls++;
        if (polls >= MAX_POLLS) {
          clearInterval(timer);
          localStorage.removeItem("digilocker_txnId");
          setStatus("error");
          setMessage("Network error. Please try again.");
        }
      }
    }, POLL_INTERVAL);

    return () => clearInterval(timer);
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
              <button onClick={() => router.push("/kyc/register")} className="btn-primary w-full">
                Back to KYC
              </button>
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
