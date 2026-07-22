import { generateOTP, verifyOTP } from "@/lib/mock-otp";
import { getAadhaarProfile, type AadhaarProfile } from "@/lib/mock-aadhaar";
import type { AadhaarProvider } from "../interfaces";

export class MockAadhaarProvider implements AadhaarProvider {
  async sendOtp(aadhaarNumber: string): Promise<{ success: boolean; message: string }> {
    const otp = generateOTP(aadhaarNumber);
    console.log(`[MOCK] Aadhaar OTP [${otp}] sent for [${aadhaarNumber}]`);
    return {
      success: true,
      message: "OTP sent to your Aadhaar-linked mobile number.",
    };
  }

  async verifyOtp(aadhaarNumber: string, otp: string): Promise<AadhaarProfile | null> {
    const valid = verifyOTP(aadhaarNumber, otp);
    if (!valid) return null;

    const profile = getAadhaarProfile(aadhaarNumber);
    return profile;
  }
}
