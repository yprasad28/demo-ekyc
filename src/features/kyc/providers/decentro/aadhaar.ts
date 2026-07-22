import { decentroRequest } from "./client";
import type {
  DigiLockerProvider,
  DigiLockerSessionResult,
  AadhaarProfile,
} from "../interfaces";

function generateRefId(): string {
  return `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class DecentroDigiLockerProvider implements DigiLockerProvider {
  async initiateSession(): Promise<DigiLockerSessionResult> {
    const result = await decentroRequest(
      "/v2/kyc/sso/digilocker/session",
      {
        consent: true,
        purpose: "KYC verification for account opening",
        reference_id: generateRefId(),
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/kyc/aadhaar/callback`,
      }
    );

    const txnId = result.decentroTxnId || (result.result?.decentroTxnId as string) || "";
    const authUrl =
      (result.result?.authorizationUrl as string) ||
      (result.data?.authorizationUrl as string) ||
      "";

    if (!authUrl) {
      throw new Error("No authorization URL received from Decentro");
    }

    return {
      success: true,
      txnId,
      authorizationUrl: authUrl,
    };
  }

  async fetchEaadhaar(txnId: string): Promise<AadhaarProfile | null> {
    const result = await decentroRequest(
      `/v2/kyc/sso/digilocker/${txnId}/eaadhaar`,
      {
        consent: true,
        purpose: "KYC verification for account opening",
        reference_id: generateRefId(),
      }
    );

    const profile =
      (result.result as Record<string, unknown>) ||
      (result.data as Record<string, unknown>);

    if (!profile) return null;

    const name =
      (profile.full_name as string) ||
      (profile.name as string) ||
      "";
    const dob = (profile.dob as string) || (profile.date_of_birth as string) || "";
    const gender =
      (profile.gender as "M" | "F") ||
      ((profile.gender as string)?.toUpperCase() === "F" ? "F" : "M");
    const addressParts: string[] = [];
    if (profile.house) addressParts.push(profile.house as string);
    if (profile.street) addressParts.push(profile.street as string);
    if (profile.locality) addressParts.push(profile.locality as string);
    if (profile.district) addressParts.push(profile.district as string);
    if (profile.state) addressParts.push(profile.state as string);
    if (profile.pincode) addressParts.push(profile.pincode as string);
    const address = addressParts.join(", ");
    const maskedAadhaar =
      (profile.aadhaar_number as string) ||
      (profile.uid as string) ||
      "";
    const photo =
      (profile.photo as string) ||
      (profile.photo_url as string) ||
      "";

    return {
      name,
      dob,
      gender: gender as "M" | "F",
      address,
      maskedAadhaar,
      photo,
    };
  }
}
