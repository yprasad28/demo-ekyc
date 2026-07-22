import { surepassRequest } from "./client";
import type { AadhaarProvider, AadhaarProfile } from "../interfaces";

export class SurepassAadhaarProvider implements AadhaarProvider {
  async sendOtp(aadhaarNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await surepassRequest("/api/v1/aadhaar/generate-otp", {
        id_number: aadhaarNumber,
      });

      if (response.status !== 0) {
        return {
          success: false,
          message: response.message || "Failed to send OTP",
        };
      }

      return {
        success: true,
        message: "OTP sent to your Aadhaar-linked mobile number.",
      };
    } catch (error) {
      console.error("[SUREPASS AADHAAR] Send OTP failed:", error);
      return {
        success: false,
        message: "Failed to send OTP. Please try again.",
      };
    }
  }

  async verifyOtp(aadhaarNumber: string, otp: string): Promise<AadhaarProfile | null> {
    try {
      const response = await surepassRequest("/api/v1/aadhaar/verify-otp", {
        client_id: aadhaarNumber,
        otp: otp,
      });

      if (response.status !== 0 || !response.result) {
        console.error("[SUREPASS AADHAAR] Verify OTP failed:", response.message);
        return null;
      }

      const result = response.result;

      const address = result.combinedAddress as string ||
        [
          result.houseNumber,
          result.street,
          result.landmark,
          result.district,
          result.state,
          result.pincode,
        ].filter(Boolean).join(", ") || "";

      const padaf = result.PADAF as { docUrl?: string } | undefined;

      return {
        name: (result.name as string) || "",
        dob: (result.dob as string) || "",
        gender: (result.gender as string === "F" ? "F" : "M") as "M" | "F",
        address,
        maskedAadhaar: (result.maskedAadhaarNumber as string) || aadhaarNumber.replace(/(\d{4})$/, "****$1"),
        photo: padaf?.docUrl || "",
      };
    } catch (error) {
      console.error("[SUREPASS AADHAAR] Verify OTP failed:", error);
      return null;
    }
  }
}
