interface OtpEntry {
  mobile: string;
  otp: string;
  expiresAt: number; // timestamp in ms
}

// In-memory storage for active OTPs (since this is a serverless context, we will bind to a global variable)
const globalForOtp = global as unknown as { otpStore: Record<string, OtpEntry> };
if (!globalForOtp.otpStore) {
  globalForOtp.otpStore = {};
}

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export function generateOTP(mobile: string): string {
  // Generate a random 6-digit number
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set expiration (5 minutes from now)
  const expiresAt = Date.now() + OTP_EXPIRY_MS;
  
  globalForOtp.otpStore[mobile] = {
    mobile,
    otp,
    expiresAt
  };
  
  // Log to console in dev mode
  console.log(`[SMS MOCK ENGINE] Sent OTP [${otp}] to mobile [${mobile}]. Expiries at ${new Date(expiresAt).toLocaleTimeString()}`);
  
  return otp;
}

export function verifyOTP(mobile: string, otp: string): boolean {
  const entry = globalForOtp.otpStore[mobile];
  
  if (!entry) {
    return false;
  }
  
  // Check expiration
  if (Date.now() > entry.expiresAt) {
    delete globalForOtp.otpStore[mobile];
    return false;
  }
  
  // Verify match
  if (entry.otp === otp) {
    delete globalForOtp.otpStore[mobile]; // consume OTP on success
    return true;
  }
  
  return false;
}
