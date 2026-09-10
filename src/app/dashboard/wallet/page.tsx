"use client";
import React, { useState, useEffect, useCallback } from "react";

const FILLED: React.CSSProperties = { fontVariationSettings: "'FILL' 1" };

const PRESET_AMOUNTS = [
  { value: 50000, label: "₹500" },
  { value: 100000, label: "₹1,000" },
  { value: 200000, label: "₹2,000" },
  { value: 500000, label: "₹5,000" },
];

interface WalletBalance {
  balance: number;
  balanceFormatted: number;
  freeCredits: { pan: number; creditScore: number; aadhaar: number };
  lowBalance: boolean;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  amountFormatted: number;
  balanceAfter: number;
  balanceAfterFormatted: number;
  description: string;
  referenceId: string | null;
  createdAt: string;
}

type PaymentStatus = "idle" | "creating" | "processing" | "success" | "failed";

export default function WalletPage() {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAmount, setSelectedAmount] = useState<number>(50000);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const getToken = () => {
    if (typeof window !== "undefined") return localStorage.getItem("kyc_token");
    return null;
  };

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  }), []);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet/balance", { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setBalance(data);
    } catch (e) {
      console.error("Failed to fetch balance:", e);
    }
  }, [authHeaders]);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet/transactions", { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setTransactions(data.transactions);
    } catch (e) {
      console.error("Failed to fetch transactions:", e);
    }
  }, [authHeaders]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchBalance(), fetchTransactions()]);
      setLoading(false);
    };
    load();
  }, [fetchBalance, fetchTransactions]);

  const getAmount = () => (isCustom ? (parseInt(customAmount) || 0) * 100 : selectedAmount);

  const handleTopUp = async () => {
    const amount = getAmount();
    if (amount < 50000) {
      setPaymentMessage("Minimum top-up is ₹500");
      setPaymentStatus("failed");
      return;
    }

    setPaymentStatus("creating");

    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ amount, idempotencyKey }),
      });
      const data = await res.json();

      if (!data.success) {
        setPaymentMessage(data.error || "Failed to create order");
        setPaymentStatus("failed");
        return;
      }

      setPaymentStatus("processing");

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || "INR",
        name: "SecureKYC",
        description: `Wallet Top-up - ₹${amount / 100}`,
        order_id: data.orderId,
        prefill: {
          name: "Admin User",
          email: "admin@securekyc.in",
          contact: "9999999999",
        },
        handler: async (response: Record<string, string>) => {
          try {
            const verifyRes = await fetch("/api/wallet/topup/verify", {
              method: "POST",
              headers: authHeaders(),
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              setPaymentMessage(`₹${verifyData.balanceFormatted} added to your wallet!`);
              setPaymentStatus("success");
              await Promise.all([fetchBalance(), fetchTransactions()]);
            } else {
              setPaymentMessage(verifyData.error || "Verification failed");
              setPaymentStatus("failed");
            }
          } catch {
            setPaymentMessage("Verification failed. Contact support.");
            setPaymentStatus("failed");
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentStatus("idle");
            setPaymentMessage("");
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch {
      setPaymentMessage("Failed to initiate payment. Please try again.");
      setPaymentStatus("failed");
    }
  };

  const resetPayment = () => {
    setPaymentStatus("idle");
    setPaymentMessage("");
  };

  const getTxIcon = (type: string) => {
    switch (type) {
      case "TOPUP": return "add_circle";
      case "KYC_DEDUCTION": return "remove_circle";
      case "KYC_REFUND": return "replay";
      case "FREE_CREDIT_USE": return "card_giftcard";
      case "FREE_CREDIT_RESTORE": return "restore";
      case "ADMIN_ADJUSTMENT": return "admin_panel_settings";
      default: return "receipt_long";
    }
  };

  const getTxColor = (type: string) => {
    switch (type) {
      case "TOPUP": return "text-green-600";
      case "KYC_DEDUCTION": return "text-red-500";
      case "KYC_REFUND": return "text-blue-500";
      case "FREE_CREDIT_USE": return "text-gray-500";
      case "FREE_CREDIT_RESTORE": return "text-purple-500";
      case "ADMIN_ADJUSTMENT": return "text-orange-500";
      default: return "text-gray-500";
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
          <p className="text-sm text-on-surface-variant">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-20 glass-nav border-b border-outline-variant/20">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={FILLED}>account_balance_wallet</span>
            <h1 className="text-base font-bold text-on-surface">Wallet</h1>
          </div>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1 text-sm text-secondary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Low Balance Alert */}
        {balance && (balance.balance < 10000 || balance.lowBalance) && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <span className="material-symbols-outlined text-red-500" style={FILLED}>warning</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">Low Balance</p>
              <p className="text-xs text-red-600">
                Your wallet balance is ₹{balance.balanceFormatted}. Top up to continue KYC verifications.
              </p>
            </div>
            <button
              onClick={() => document.getElementById("topup-section")?.scrollIntoView({ behavior: "smooth" })}
              className="text-xs font-semibold text-red-700 bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors"
            >
              Top Up Now
            </button>
          </div>
        )}

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-primary to-primary-container rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-white/80" style={FILLED}>account_balance_wallet</span>
            <span className="text-sm font-medium text-white/80">Available Balance</span>
          </div>
          <p className="text-4xl font-extrabold mb-6">
            ₹{balance?.balanceFormatted?.toLocaleString("en-IN") ?? "0"}
          </p>

          {/* Free Credits */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "PAN", count: balance?.freeCredits.pan ?? 0, icon: "credit_card" },
              { label: "Aadhaar", count: balance?.freeCredits.aadhaar ?? 0, icon: "fingerprint" },
              { label: "Score", count: balance?.freeCredits.creditScore ?? 0, icon: "speed" },
            ].map((item) => (
              <div key={item.label} className="bg-white/15 rounded-xl px-3 py-2.5 text-center backdrop-blur-sm">
                <span className="material-symbols-outlined text-lg text-white/80">{item.icon}</span>
                <p className="text-lg font-bold mt-0.5">{item.count}</p>
                <p className="text-[10px] text-white/70 font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top-Up Section */}
        <div id="topup-section" className="card">
          <h2 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">add_circle</span>
            Top Up Wallet
          </h2>

          {/* Amount Selection */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
            {PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => { setSelectedAmount(preset.value); setIsCustom(false); }}
                className={`h-12 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  !isCustom && selectedAmount === preset.value
                    ? "bg-primary text-on-primary shadow-primary-glow scale-105"
                    : "bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline-variant/30"
                }`}
              >
                {preset.label}
              </button>
            ))}
            <button
              onClick={() => setIsCustom(true)}
              className={`h-12 rounded-xl font-semibold text-sm transition-all duration-200 ${
                isCustom
                  ? "bg-primary text-on-primary shadow-primary-glow scale-105"
                  : "bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline-variant/30"
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom Amount Input */}
          {isCustom && (
            <div className="mb-4">
              <label className="input-label">Enter amount (₹)</label>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Min ₹500, Max ₹50,000"
                className="input-field"
                min={500}
                max={50000}
              />
            </div>
          )}

          {/* Top-Up Button */}
          <button
            onClick={handleTopUp}
            disabled={paymentStatus === "creating" || paymentStatus === "processing" || getAmount() < 50000}
            className="btn-primary mt-2"
          >
            {paymentStatus === "creating" ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                Creating Order...
              </>
            ) : paymentStatus === "processing" ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                Processing Payment...
              </>
            ) : (
              <>
                Top Up ₹{((isCustom ? (parseInt(customAmount) || 0) : selectedAmount) / 100).toLocaleString("en-IN")}
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>

        {/* Payment Result Overlay */}
        {paymentStatus === "success" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-xl">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-green-600 text-3xl" style={FILLED}>check_circle</span>
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-2">Payment Successful!</h3>
              <p className="text-sm text-on-surface-variant mb-4">{paymentMessage}</p>
              <div className="flex gap-3">
                <button onClick={resetPayment} className="btn-secondary flex-1">Close</button>
                <button onClick={() => window.history.back()} className="btn-primary flex-1">Continue</button>
              </div>
            </div>
          </div>
        )}

        {paymentStatus === "failed" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-xl">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-red-500 text-3xl">cancel</span>
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-2">Payment Failed</h3>
              <p className="text-sm text-on-surface-variant mb-4">{paymentMessage}</p>
              <button onClick={resetPayment} className="btn-primary w-full">Try Again</button>
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="card">
          <h2 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">receipt_long</span>
            Transaction History
          </h2>

          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">receipt</span>
              <p className="text-sm text-on-surface-variant mt-2">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container/50 hover:bg-surface-container transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === "TOPUP" ? "bg-green-100" :
                    tx.type === "KYC_DEDUCTION" ? "bg-red-100" :
                    tx.type === "KYC_REFUND" ? "bg-blue-100" : "bg-gray-100"
                  }`}>
                    <span className={`material-symbols-outlined text-lg ${getTxColor(tx.type)}`}>
                      {getTxIcon(tx.type)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">{tx.description}</p>
                    <p className="text-xs text-on-surface-variant">{formatDate(tx.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${
                      tx.amount > 0 ? "text-green-600" : tx.amount < 0 ? "text-red-500" : "text-gray-500"
                    }`}>
                      {tx.amount > 0 ? "+" : ""}{tx.amountFormatted > 0 ? `₹${tx.amountFormatted}` : "Free"}
                    </p>
                    <p className="text-[10px] text-on-surface-variant">
                      Bal: ₹{tx.balanceAfterFormatted}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pricing Info */}
        <div className="card bg-surface-container/30">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">KYC Pricing</h3>
          <div className="space-y-2 text-sm">
            {[
              { label: "PAN Verification", price: "₹3" },
              { label: "Aadhaar / DigiLocker", price: "₹3" },
              { label: "Credit Score Check", price: "₹25" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-on-surface-variant">{item.label}</span>
                <span className="font-semibold text-on-surface">{item.price}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
