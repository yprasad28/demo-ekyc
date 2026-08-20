// Authentication
export const JWT_SECRET = process.env.JWT_SECRET || "securekyc-demo-secret-key-2024";
export const CUSTOMER_TOKEN_MAX_AGE = 86400; // 24 hours in seconds
export const ADMIN_TOKEN_MAX_AGE = 28800; // 8 hours in seconds
export const CUSTOMER_TOKEN_EXPIRY = "24h";
export const ADMIN_TOKEN_EXPIRY = "8h";

// KYC Flow
export const TOTAL_STEPS = 8;
export const OTP_LENGTH = 6;
export const OTP_TIMER_SECONDS = 30;
export const AADHAAR_LENGTH = 12;
export const MOBILE_LENGTH = 10;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const OCR_TIMEOUT_MS = 10000;

// API Endpoints
export const API = {
  CUSTOMER_LOGIN: "/api/auth/customer-login",
  VERIFY_OTP: "/api/auth/verify-otp",
  AADHAAR_OTP_SEND: "/api/kyc/aadhaar/otp-send",
  AADHAAR_OTP_VERIFY: "/api/kyc/aadhaar/otp-verify",
  SAVE_STEP: "/api/kyc/save-step",
  UPLOAD: "/api/kyc/upload",
  CREDIT_SCORE: "/api/kyc/credit-score",
  // Wallet endpoints
  WALLET_BALANCE: "/api/wallet/balance",
  WALLET_TOPUP: "/api/wallet/topup",
  WALLET_TOPUP_VERIFY: "/api/wallet/topup/verify",
  WALLET_CREDITS: "/api/wallet/credits",
  WALLET_TRANSACTIONS: "/api/wallet/transactions",
} as const;

// Credit Score Thresholds
export const CREDIT_SCORE_EXCELLENT = 750;
export const CREDIT_SCORE_GOOD = 700;
export const CREDIT_SCORE_FAIR = 650;

// Match thresholds
export const NAME_MATCH_GOOD_THRESHOLD = 60;
export const DOB_MISMATCH_PENALTY = 50;

// Supabase
export const SUPABASE_BUCKET = "kyc-documents";

// Regex
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const MOBILE_REGEX = /^[0-9]{10}$/;

// ─── Wallet & Payment Constants ───────────────────────────────────────────────

// Free trial credits (no expiry)
export const FREE_CREDITS = {
  PAN: 5,
  CREDIT_SCORE: 5,
  AADHAAR: 5,
} as const;

// Wallet top-up rules
export const WALLET = {
  MIN_TOPUP: 500,           // ₹500 minimum top-up
  MAX_TOPUP: 50000,         // ₹50,000 maximum top-up
  CURRENCY: "INR",
  LOW_BALANCE_ALERT: 100,   // Alert below ₹100
  ORDER_EXPIRY_MINUTES: 30, // Orders expire after 30 min
} as const;

// KYC service pricing (what user pays)
export const KYC_PRICING = {
  PAN_BASIC: { price: 3, cost: 1.40, label: "PAN Basic" },
  PAN_DETAILED_CORE: { price: 3, cost: 1.75, label: "PAN Detailed Core" },
  PAN_DETAILED_PLUS: { price: 4, cost: 2.25, label: "PAN Detailed Plus" },
  PAN_DETAILED_COMPLETE: { price: 4, cost: 2.50, label: "PAN Detailed Complete" },
  CREDIT_SCORE: { price: 25, cost: 20, label: "Credit Score" },
  AADHAAR: { price: 3, cost: 1.20, label: "Aadhaar (DigiLocker)" },
} as const;

// Payment order statuses (state machine)
export const PaymentStatus = {
  CREATED: "CREATED",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  VERIFIED: "VERIFIED",
  CAPTURED: "CAPTURED",
  CREDITED: "CREDITED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  EXPIRED: "EXPIRED",
} as const;

// Wallet transaction types
export const WalletTxType = {
  TOPUP: "TOPUP",
  TOPUP_REFUND: "TOPUP_REFUND",
  KYC_DEDUCTION: "KYC_DEDUCTION",
  KYC_REFUND: "KYC_REFUND",
  FREE_CREDIT_USE: "FREE_CREDIT_USE",
  FREE_CREDIT_RESTORE: "FREE_CREDIT_RESTORE",
  ADMIN_ADJUSTMENT: "ADMIN_ADJUSTMENT",
} as const;
