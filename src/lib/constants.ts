// Authentication
export const JWT_SECRET = process.env.JWT_SECRET || "securekyc-demo-secret-key-2024";
export const CUSTOMER_TOKEN_MAX_AGE = 86400; // 24 hours in seconds
export const ADMIN_TOKEN_MAX_AGE = 28800; // 8 hours in seconds
export const CUSTOMER_TOKEN_EXPIRY = "24h";
export const ADMIN_TOKEN_EXPIRY = "8h";

// KYC Flow
export const TOTAL_STEPS = 7;
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
  PAN_VERIFY: "/api/kyc/pan/verify",
  SAVE_STEP: "/api/kyc/save-step",
  UPLOAD: "/api/kyc/upload",
} as const;

// Match thresholds
export const NAME_MATCH_GOOD_THRESHOLD = 60;
export const DOB_MISMATCH_PENALTY = 50;

// Supabase
export const SUPABASE_BUCKET = "kyc-documents";

// Regex
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const MOBILE_REGEX = /^[0-9]{10}$/;
