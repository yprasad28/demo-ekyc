import { decentroRequest } from "./client";
import type { DigiLockerSessionResult } from "../interfaces";

function generateRefId(): string {
  return `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function createUIStreamSession(mobile?: string): Promise<DigiLockerSessionResult> {
  const result = await decentroRequest("/v2/kyc/workflows/uistream", {
    reference_id: generateRefId(),
    consent: true,
    purpose: "To perform KYC of the customer",
    callback_url: `${appUrl}/api/kyc/aadhaar/callback`,
    redirect_url: `${appUrl}/kyc/aadhaar/callback`,
    uistream: "DIGILOCKER_AADHAAR_PAN",
    additional_data: { mobile: mobile || "", pan_optional: false },
    skip_survey: true,
    disable_multiple_tabs: false,
    language: "en",
    force_aadhaar: false,
    force_mobile: false,
    clear_cookies: false,
    enable_name_match: true,
  });

  const txnId = result.decentroTxnId || "";
  const sessionUrl =
    (result.data?.url as string) ||
    (result.result?.url as string) ||
    (result.result?.sessionUrl as string) ||
    (result.data?.sessionUrl as string) ||
    (result.result?.authorizationUrl as string) ||
    (result.data?.authorizationUrl as string) ||
    "";

  if (!sessionUrl) {
    throw new Error("No session URL received from Decentro UIStreams");
  }

  return {
    success: true,
    txnId,
    authorizationUrl: sessionUrl,
  };
}

export interface UIStreamCallbackPayload {
  initialDecentroTxnId: string;
  status: string;
  message: string;
  responseKey: string;
  data?: {
    AADHAAR?: {
      decentroTxnId: string;
      status: string;
      responseCode: string;
      message: string;
      data: {
        aadhaarUid?: string;
        proofOfIdentity?: {
          dob?: string;
          gender?: string;
          name?: string;
          hashedMobileNumber?: string;
        };
        proofOfAddress?: {
          careOf?: string;
          country?: string;
          district?: string;
          house?: string;
          landmark?: string;
          locality?: string;
          pincode?: string;
          postOffice?: string;
          state?: string;
          street?: string;
          subDistrict?: string;
          vtc?: string;
        };
        image?: string;
        pdf?: string;
        xml?: string;
      };
      responseKey?: string;
    };
    EAADHAAR?: {
      decentroTxnId: string;
      status: string;
      responseCode: string;
      message: string;
      data: {
        aadhaarUid?: string;
        proofOfIdentity?: {
          dob?: string;
          gender?: string;
          name?: string;
          hashedMobileNumber?: string;
        };
        proofOfAddress?: {
          careOf?: string;
          country?: string;
          district?: string;
          house?: string;
          landmark?: string;
          locality?: string;
          pincode?: string;
          postOffice?: string;
          state?: string;
          street?: string;
          subDistrict?: string;
          vtc?: string;
        };
        image?: string;
        pdf?: string;
        xml?: string;
      };
      responseKey?: string;
    };
    PAN?: {
      idNumber?: string;
      userName?: string;
      userDateOfBirth?: string;
      userGender?: string;
      documentVerifiedOn?: string;
      documentStatus?: string;
      documentBase64?: string;
      documentIssuer?: string;
      documentName?: string;
      documentType?: string;
      message?: string;
    };
    NAME_MATCH?: {
      aadhaarName?: string;
      panName?: string;
      matchScore?: number;
      isMatch?: boolean;
    };
  };
}

export function parseUIStreamCallback(payload: UIStreamCallbackPayload) {
  const aadhaar = payload.data?.AADHAAR || payload.data?.EAADHAAR;
  const pan = payload.data?.PAN;
  const nameMatch = payload.data?.NAME_MATCH;

  if (!aadhaar || aadhaar.status !== "SUCCESS" || !aadhaar.data) {
    return null;
  }

  const { proofOfIdentity, proofOfAddress, image } = aadhaar.data;
  const uid = aadhaar.data.aadhaarUid || "";

  const name = proofOfIdentity?.name || "";
  const dob = proofOfIdentity?.dob || "";
  const gender = (proofOfIdentity?.gender as "M" | "F") || "M";

  const addressParts: string[] = [];
  if (proofOfAddress?.house) addressParts.push(proofOfAddress.house);
  if (proofOfAddress?.street) addressParts.push(proofOfAddress.street);
  if (proofOfAddress?.locality) addressParts.push(proofOfAddress.locality);
  if (proofOfAddress?.district) addressParts.push(proofOfAddress.district);
  if (proofOfAddress?.state) addressParts.push(proofOfAddress.state);
  if (proofOfAddress?.pincode) addressParts.push(proofOfAddress.pincode);
  const address = addressParts.join(", ");

  const maskedAadhaar = uid ? uid.replace(/(\d{4})/g, "$1 ").trim() : "";

  let panData = null;
  let panError = null;
  if (pan && pan.idNumber && (pan.userName || pan.documentStatus)) {
    panData = {
      panNumber: pan.idNumber || "",
      name: pan.userName || "",
      dob: pan.userDateOfBirth || "",
      status: pan.documentStatus || "VALID",
      panType: "INDIVIDUAL",
    };
  } else if (pan && pan.message) {
    panError = pan.message;
  }

  let nameMatchResult = null;
  if (nameMatch) {
    nameMatchResult = {
      score: nameMatch.matchScore || 0,
      aadhaarName: nameMatch.aadhaarName || "",
      panName: nameMatch.panName || "",
      isMatch: nameMatch.isMatch || false,
    };
  }

  return {
    name,
    dob,
    gender,
    address,
    maskedAadhaar,
    photo: image || "",
    panData,
    panError,
    nameMatchResult,
  };
}
