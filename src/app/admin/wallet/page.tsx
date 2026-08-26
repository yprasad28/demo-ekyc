"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  description: string | null;
  referenceId: string | null;
  createdAt: string;
}

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000];
const MOCK_AMOUNTS = [50000, 100000, 500000, 1000000];
const RUPEE = "\u20B9";

export default function AdminWalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState<number>(50000);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ success: boolean; message: string } | null>(null);
  const [mockAmount, setMockAmount] = useState(100000);
  const [mockProcessing, setMockProcessing] = useState(false);

  const fetchWalletData = useCallback(async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) { router.push("/admin/login"); return; }
    try {
      const [balanceRes, txRes] = await Promise.all([
        fetch("/api/wallet/balance", { headers: { Authorization: "Bearer " + token } }),
        fetch("/api/wallet/transactions?limit=20", { headers: { Authorization: "Bearer " + token } })
      ]);
      if (balanceRes.status === 401 || txRes.status === 401) { router.push("/admin/login"); return; }
      const balanceData = await balanceRes.json();
      const txData = await txRes.json();
      if (balanceData.success) setWallet(balanceData);
      if (txData.success) setTransactions(txData.transactions);
    } catch (e) { console.error("Failed to fetch wallet data:", e); }
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchWalletData(); }, [fetchWalletData]);

  useEffect(() => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) return;
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleTopup = async () => {
    const amount = isCustom ? parseInt(customAmount) * 100 : topupAmount;
    if (!amount || amount < 50000) { setPaymentResult({ success: false, message: "Minimum top-up is 500" }); return; }
    setProcessing(true);
    const token = localStorage.getItem("admin_token");
    try {
      const orderRes = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ amount, idempotencyKey: crypto.randomUUID() })
      });
      const orderData = await orderRes.json();
      if (!orderData.success) { setPaymentResult({ success: false, message: orderData.error || "Failed to create order" }); setProcessing(false); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(window as any).Razorpay) { setPaymentResult({ success: false, message: "Payment gateway loading. Try again." }); setProcessing(false); return; }
      const options = {
        key: orderData.keyId, amount: orderData.amount, currency: orderData.currency || "INR",
        name: "SecureKYC Platform Wallet", description: "Top up platform wallet", order_id: orderData.orderId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (response: any) => {
          const verifyRes = await fetch("/api/wallet/topup/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
            body: JSON.stringify({ razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, razorpaySignature: response.razorpay_signature })
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) { setPaymentResult({ success: true, message: verifyData.message }); fetchWalletData(); }
          else { setPaymentResult({ success: false, message: verifyData.error || "Verification failed" }); }
          setProcessing(false);
        },
        prefill: { name: "Platform Admin", email: "admin@securekyc.in" },
        theme: { color: "#6750A4" },
        modal: { ondismiss: () => setProcessing(false) }
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (e) { console.error("Top-up error:", e); setPaymentResult({ success: false, message: "Top-up failed." }); setProcessing(false); }
  };

  const handleMockTopup = async (amount: number) => {
    setMockProcessing(true);
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch("/api/wallet/mock-topup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      if (data.success) { setPaymentResult({ success: true, message: data.message }); fetchWalletData(); }
      else { setPaymentResult({ success: false, message: data.error || "Mock top-up failed" }); }
    } catch (e) { console.error("Mock top-up error:", e); setPaymentResult({ success: false, message: "Mock top-up failed." }); }
    setMockProcessing(false);
  };

  const getTxIcon = (type: string) => {
    switch (type) {
      case "TOPUP": return { icon: "add_circle", color: "text-green-600" };
      case "KYC_DEDUCTION": return { icon: "remove_circle", color: "text-red-600" };
      case "KYC_REFUND": return { icon: "replay", color: "text-blue-600" };
      case "FREE_CREDIT_USE": return { icon: "card_giftcard", color: "text-purple-600" };
      case "FREE_CREDIT_RESTORE": return { icon: "restore", color: "text-orange-600" };
      default: return { icon: "swap_horiz", color: "text-on-surface-variant" };
    }
  };

  return (
    <div className="min-h-screen flex bg-surface">
      <aside className="hidden lg:flex w-60 flex-col bg-surface-container-lowest border-r border-outline-variant/20 fixed top-0 left-0 h-full z-10">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-outline-variant/20">
          <div className="w-9 h-9 bg-primary-container rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>shield_person</span>
          </div>
          <span className="font-bold text-primary text-base">SecureKYC</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <Link href="/admin/dashboard" className="nav-item"><span className="material-symbols-outlined text-[20px]">dashboard</span> Dashboard</Link>
          <Link href="/admin/wallet" className="nav-item active"><span className="material-symbols-outlined text-[20px]">account_balance_wallet</span> Wallet</Link>
        </nav>
        <div className="p-3 border-t border-outline-variant/20">
          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container transition-colors cursor-pointer" onClick={() => { localStorage.removeItem("admin_token"); localStorage.removeItem("admin_info"); router.push("/admin/login"); }}>
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center"><span className="material-symbols-outlined text-primary text-[16px]">person</span></div>
            <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-on-surface truncate">Admin</p><p className="text-[10px] text-on-surface-variant">Logout</p></div>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">logout</span>
          </div>
        </div>
      </aside>
      <main className="flex-1 lg:ml-60 min-h-screen">
        <header className="sticky top-0 z-20 glass-nav border-b border-outline-variant/20 flex items-center justify-between px-6 h-14">
          <div><h1 className="font-bold text-base text-on-surface">Platform Wallet</h1><p className="text-[11px] text-on-surface-variant">Manage funds for KYC verifications</p></div>
          <Link href="/admin/dashboard" className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors">Back to Dashboard</Link>
        </header>
        <div className="p-6 space-y-6">
          {loading ? (<div className="space-y-4"><div className="skeleton h-40 rounded-2xl" /><div className="skeleton h-60 rounded-2xl" /></div>) : (<>
            <div className="bg-gradient-to-br from-primary to-primary-container rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-on-primary/80">Platform Wallet Balance</p>
                {wallet?.lowBalance && (<span className="flex items-center gap-1 text-xs font-semibold bg-red-500/20 text-red-100 px-2.5 py-1 rounded-full"><span className="material-symbols-outlined text-[14px]">warning</span> Low Balance</span>)}
              </div>
              <p className="text-4xl font-bold text-on-primary mb-4">{RUPEE}{wallet?.balanceFormatted?.toLocaleString("en-IN") || "0"}</p>
              <div className="grid grid-cols-3 gap-4">
                {[{ label: "Free PAN", value: wallet?.freeCredits?.pan || 0, icon: "credit_card" }, { label: "Free Aadhaar", value: wallet?.freeCredits?.aadhaar || 0, icon: "fingerprint" }, { label: "Free Credit Score", value: wallet?.freeCredits?.creditScore || 0, icon: "analytics" }].map((item) => (
                  <div key={item.label} className="bg-white/10 rounded-xl p-3"><span className="material-symbols-outlined text-on-primary/60 text-[16px]">{item.icon}</span><p className="text-lg font-bold text-on-primary mt-1">{item.value}</p><p className="text-[10px] text-on-primary/70">{item.label}</p></div>
                ))}
              </div>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-card p-6">
              <h2 className="font-bold text-sm text-on-surface mb-4">Top Up Wallet (Razorpay)</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {PRESET_AMOUNTS.map((amount) => (<button key={amount} onClick={() => { setTopupAmount(amount); setIsCustom(false); }} className={"p-3 rounded-xl border-2 text-center transition-all " + (!isCustom && topupAmount === amount ? "border-primary bg-lavender shadow-primary-glow" : "border-outline-variant/30 hover:border-primary/50")}><p className="text-lg font-bold text-on-surface">{RUPEE}{(amount / 100).toLocaleString("en-IN")}</p></button>))}
              </div>
              <div className="flex gap-3">
                <div className="flex-1"><input type="number" placeholder="Custom amount (min 500)" className="w-full h-12 px-4 border border-outline-variant rounded-xl text-sm bg-surface-container focus:outline-none focus:border-primary" value={customAmount} onChange={(e) => { setCustomAmount(e.target.value); setIsCustom(true); }} onFocus={() => setIsCustom(true)} /></div>
                <button onClick={handleTopup} disabled={processing} className="h-12 px-6 bg-primary text-on-primary rounded-full text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-primary-glow disabled:opacity-50 flex items-center gap-2">
                  {processing ? (<><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Processing...</>) : (<><span className="material-symbols-outlined text-[18px]">add</span> Top Up</>)}
                </button>
              </div>
            </div>
            <div className="bg-amber-50 rounded-2xl border border-amber-200 shadow-card p-6">
              <div className="flex items-center gap-2 mb-4"><span className="material-symbols-outlined text-amber-600 text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>science</span><h2 className="font-bold text-sm text-amber-800">Mock Top-Up (Testing)</h2></div>
              <p className="text-xs text-amber-600 mb-4">Add test funds without real payment. For development and demo testing.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {MOCK_AMOUNTS.map((amt) => (<button key={amt} onClick={() => setMockAmount(amt)} className={"p-3 rounded-xl border-2 text-center transition-all " + (mockAmount === amt ? "border-amber-500 bg-amber-100" : "border-amber-200 hover:border-amber-400")}><p className="text-lg font-bold text-amber-800">{RUPEE}{(amt / 100).toLocaleString("en-IN")}</p></button>))}
              </div>
              <button onClick={() => handleMockTopup(mockAmount)} disabled={mockProcessing} className="w-full h-12 bg-amber-600 text-white rounded-full text-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {mockProcessing ? (<><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Adding...</>) : (<><span className="material-symbols-outlined text-[18px]">add_circle</span> Add {RUPEE}{(mockAmount / 100).toLocaleString("en-IN")} Mock Funds</>)}
              </button>
            </div>
            {paymentResult && (<div className={"flex items-center gap-3 p-4 rounded-xl border " + (paymentResult.success ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700")}><span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>{paymentResult.success ? "check_circle" : "error"}</span><p className="text-sm font-medium flex-1">{paymentResult.message}</p><button onClick={() => setPaymentResult(null)} className="text-[14px]">X</button></div>)}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-card overflow-hidden">
              <div className="p-4 border-b border-outline-variant/20"><h2 className="font-bold text-sm text-on-surface">Transaction History</h2></div>
              {transactions.length === 0 ? (<div className="flex flex-col items-center justify-center py-12 text-on-surface-variant"><span className="material-symbols-outlined text-[40px] mb-2 opacity-40">receipt_long</span><p className="text-sm font-medium">No transactions yet</p><p className="text-xs opacity-70">Top up your wallet to start</p></div>) : (
                <div className="divide-y divide-outline-variant/10">
                  {transactions.map((tx) => { const { icon, color } = getTxIcon(tx.type); return (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container/30 transition-colors">
                      <div className={"w-8 h-8 rounded-full flex items-center justify-center " + (tx.amount >= 0 ? "bg-green-50" : "bg-red-50")}><span className={"material-symbols-outlined text-[18px] " + color}>{icon}</span></div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-on-surface truncate">{tx.description || tx.type}</p><p className="text-[11px] text-on-surface-variant">{new Date(tx.createdAt).toLocaleString("en-IN")}</p></div>
                      <div className="text-right"><p className={"text-sm font-bold " + (tx.amount >= 0 ? "text-green-600" : "text-red-600")}>{tx.amount >= 0 ? "+" : "-"}{RUPEE}{Math.abs(tx.amountFormatted).toLocaleString("en-IN")}</p><p className="text-[11px] text-on-surface-variant">Bal: {RUPEE}{tx.balanceAfterFormatted.toLocaleString("en-IN")}</p></div>
                    </div>
                  ); })}
                </div>
              )}
            </div>
          </>)}
        </div>
      </main>
    </div>
  );
}
