export const razorpayConfig = {
  keyId: process.env.RAZORPAY_KEY_ID || "",
  keySecret: process.env.RAZORPAY_KEY_SECRET || "",
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  planId: process.env.RAZORPAY_PLAN_ID || "",
  // Public key for frontend (safe to expose — it's not a secret)
  publicKey: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
};
