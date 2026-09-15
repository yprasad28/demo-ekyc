import { decentroRequest } from "./client";
import type {
  DigiLockerProvider,
  DigiLockerSessionResult,
  AadhaarProfile,
  DigiLockerPanProfile,
} from "../interfaces";

function generateRefId(): string {
  return `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeGender(raw: string): string {
  const upper = raw.toUpperCase();
  if (upper === "F" || upper === "FEMALE" || upper === "WOMAN") return "F";
  return "M";
}

export class DecentroDigiLockerProvider implements DigiLockerProvider {
  async initiateSession(): Promise<DigiLockerSessionResult> {
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    console.log("[DigiLocker] Using appUrl:", appUrl);

    const result = await decentroRequest(
      "/v2/kyc/sso/digilocker/session",
      {
        consent: true,
        purpose: "KYC verification for account opening",
        reference_id: generateRefId(),
        redirect_url: `${appUrl}/kyc/aadhaar/callback`,
      }
    );

    const txnId = result.decentroTxnId || (result.result?.decentroTxnId as string) || "";

    const authUrl =
      (result.result?.authorizationUrl as string) ||
      (result.data?.authorizationUrl as string) ||
      "";

    console.log("[DigiLocker] txnId:", txnId, "authUrl:", authUrl ? authUrl.substring(0, 80) + "..." : "EMPTY");

    if (!authUrl) {
      throw new Error("No authorization URL received from Decentro. Response: " + JSON.stringify(result));
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

    // Decentro eaadhaar nests data under proofOfIdentity and proofOfAddress
    const poi = (profile.proofOfIdentity as Record<string, unknown>) || profile;
    const poa = (profile.proofOfAddress as Record<string, unknown>) || profile;

    const name =
      (poi.full_name as string) ||
      (poi.name as string) ||
      (profile.full_name as string) ||
      (profile.name as string) ||
      "";
    const dob =
      (poi.dob as string) ||
      (poi.date_of_birth as string) ||
      (profile.dob as string) ||
      (profile.date_of_birth as string) ||
      "";
    const gender =
      (poi.gender as "M" | "F") ||
      (profile.gender as "M" | "F") ||
      ((poi.gender as string || profile.gender as string)?.toUpperCase() === "F" ? "F" : "M");
    const addressParts: string[] = [];
    if (poa.house) addressParts.push(poa.house as string);
    if (poa.street) addressParts.push(poa.street as string);
    if (poa.locality) addressParts.push(poa.locality as string);
    if (poa.district) addressParts.push(poa.district as string);
    if (poa.state) addressParts.push(poa.state as string);
    if (poa.pincode) addressParts.push(poa.pincode as string);
    if (addressParts.length === 0) {
      if (profile.house) addressParts.push(profile.house as string);
      if (profile.street) addressParts.push(profile.street as string);
      if (profile.locality) addressParts.push(profile.locality as string);
      if (profile.district) addressParts.push(profile.district as string);
      if (profile.state) addressParts.push(profile.state as string);
      if (profile.pincode) addressParts.push(profile.pincode as string);
    }
    const address = addressParts.join(", ");
    const maskedAadhaar =
      (profile.aadhaarUid as string) ||
      (profile.aadhaar_number as string) ||
      (profile.uid as string) ||
      "";
    const photo =
      (profile.image as string) ||
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

  async fetchPanFromDigiLocker(txnId: string): Promise<DigiLockerPanProfile | null> {
    // Step 1: Get list of issued files from DigiLocker
    console.log("[DigiLocker-PAN] Fetching issued files for txnId:", txnId);

    const filesResult = await decentroRequest(
      `/v2/kyc/sso/digilocker/${txnId}/files/issued`,
      {
        consent: true,
        purpose: "Fetch issued files from DigiLocker",
        reference_id: generateRefId(),
      }
    );

    console.log("[DigiLocker-PAN] Issued files raw response:", JSON.stringify(filesResult, null, 2));

    const rawData = filesResult.data || filesResult.result;
    const files = Array.isArray(rawData)
      ? rawData
      : Array.isArray((rawData as Record<string, unknown>)?.items)
        ? (rawData as Record<string, unknown>).items as Array<Record<string, unknown>>
        : Array.isArray((rawData as Record<string, unknown>)?.documents)
          ? (rawData as Record<string, unknown>).documents as Array<Record<string, unknown>>
          : Array.isArray((rawData as Record<string, unknown>)?.files)
            ? (rawData as Record<string, unknown>).files as Array<Record<string, unknown>>
            : null;

    if (!files || !Array.isArray(files) || files.length === 0) {
      console.log("[DigiLocker-PAN] No issued files found. rawData type:", typeof rawData, "isArray:", Array.isArray(rawData));
      return null;
    }

    console.log("[DigiLocker-PAN] Available doctypes:", files.map((f) => `${f.doctype}(${f.name})`).join(", "));

    // Step 2: Find PAN file (doctype: PANCR)
    const panFile = files.find((f) => f.doctype === "PANCR");
    if (!panFile) {
      console.log("[DigiLocker-PAN] PAN (PANCR) not found in issued files");
      return null;
    }

    const fileUrn = panFile.uri as string;
    console.log("[DigiLocker-PAN] PAN found, file_urn:", fileUrn);

    // Step 3: Fetch PAN data using file_urn
    const panResult = await decentroRequest(
      `/v2/kyc/sso/digilocker/${txnId}/file`,
      {
        file_urn: fileUrn,
        consent: true,
        purpose: "Fetch PAN from DigiLocker for KYC",
        reference_id: generateRefId(),
      }
    );

    console.log("[DigiLocker-PAN] File data raw response:", JSON.stringify(panResult, null, 2));

    const panData = (panResult.data || panResult.result) as Record<string, unknown> | undefined;
    if (!panData) {
      console.log("[DigiLocker-PAN] PAN file data is empty/null");
      return null;
    }

    const innerData = (panData.data || panData) as Record<string, unknown>;
    const panNumber = (innerData.idNumber as string) || "";
    const userName = (innerData.userName as string) || "";
    const dob = (innerData.userDateOfBirth as string) || "";
    const gender = normalizeGender((innerData.userGender as string) || "");
    const status = (innerData.documentStatus as string) || "Active";

    console.log("[DigiLocker-PAN] PAN fetched successfully:", panNumber, "name:", userName, "gender:", gender);

    return {
      panNumber,
      name: userName,
      dob,
      gender,
      status,
    };
  }
}
