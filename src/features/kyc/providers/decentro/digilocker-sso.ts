import { decentroRequest } from "./client";

function generateRefId(): string {
  return `sso_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function initiateSSODigiLockerSession(): Promise<{
  txnId: string;
  sessionUrl: string;
}> {
  const refId = generateRefId();
  console.log("[SSO DigiLocker] Initiating session with refId:", refId);

  const result = await decentroRequest("/v2/kyc/sso/digilocker/session", {
    reference_id: refId,
    consent: true,
    purpose: "KYC verification for account opening",
    redirect_url: `${appUrl}/kyc/aadhaar/callback`,
  });

  console.log("[SSO DigiLocker] Session response status:", result.status);
  console.log("[SSO DigiLocker] Session decentroTxnId:", result.decentroTxnId);

  const txnId = result.decentroTxnId || (result.data?.decentroTxnId as string) || "";
  const sessionUrl =
    (result.data?.authorizationUrl as string) ||
    (result.data?.url as string) ||
    (result.data?.sessionUrl as string) ||
    (result.result?.url as string) ||
    (result.result?.sessionUrl as string) ||
    "";

  if (!sessionUrl) {
    console.error("[SSO DigiLocker] No session URL in response:", JSON.stringify(result));
    throw new Error("No session URL received from SSO DigiLocker");
  }

  console.log("[SSO DigiLocker] Session created. txnId:", txnId, "url length:", sessionUrl.length);
  return { txnId, sessionUrl };
}

export async function generateAccessToken(
  digilockerCode: string,
  initialDecentroTxnId: string
): Promise<void> {
  const refId = generateRefId();
  console.log("[SSO DigiLocker] Generating access token with code:", digilockerCode, "txnId:", initialDecentroTxnId);

  const result = await decentroRequest("/v2/kyc/digilocker/access_token/code", {
    reference_id: refId,
    consent: true,
    consent_purpose: "KYC verification for account opening",
    initial_decentro_transaction_id: initialDecentroTxnId,
    digilocker_code: digilockerCode,
  });

  console.log("[SSO DigiLocker] Access token response status:", result.status);
  console.log("[SSO DigiLocker] Access token response key:", result.responseKey);
}

export interface SSOAadhaarResult {
  name: string;
  dob: string;
  gender: "M" | "F";
  address: string;
  maskedAadhaar: string;
  photo: string;
}

export async function fetchSSOeAadhaar(txnId: string): Promise<SSOAadhaarResult | null> {
  const refId = generateRefId();
  console.log("[SSO eAadhaar] Fetching for txnId:", txnId, "refId:", refId);

  const result = await decentroRequest(
    `/v2/kyc/sso/digilocker/${txnId}/eaadhaar`,
    {
      reference_id: refId,
      consent: true,
      purpose: "KYC verification for account opening",
      generate_pdf: false,
      generate_xml: false,
    }
  );

  console.log("[SSO eAadhaar] Response status:", result.status);
  console.log("[SSO eAadhaar] Response keys:", Object.keys(result));

  const data = result.data || result.result;
  if (!data) return null;

  const aadhaar = data as Record<string, unknown>;
  const proofOfIdentity = aadhaar.proofOfIdentity as Record<string, unknown> | undefined;
  const proofOfAddress = aadhaar.proofOfAddress as Record<string, unknown> | undefined;

  const name = (proofOfIdentity?.name as string) || "";
  const dob = (proofOfIdentity?.dob as string) || "";
  const gender = ((proofOfIdentity?.gender as string) || "M") as "M" | "F";
  const photo = (aadhaar.image as string) || "";

  const addressParts: string[] = [];
  if (proofOfAddress?.house) addressParts.push(proofOfAddress.house as string);
  if (proofOfAddress?.street) addressParts.push(proofOfAddress.street as string);
  if (proofOfAddress?.locality) addressParts.push(proofOfAddress.locality as string);
  if (proofOfAddress?.district) addressParts.push(proofOfAddress.district as string);
  if (proofOfAddress?.state) addressParts.push(proofOfAddress.state as string);
  if (proofOfAddress?.pincode) addressParts.push(proofOfAddress.pincode as string);
  const address = addressParts.join(", ");

  const uid = (aadhaar.aadhaarUid as string) || "";
  const maskedAadhaar = uid ? uid.replace(/(\d{4})/g, "$1 ").trim() : "";

  return { name, dob, gender, address, maskedAadhaar, photo };
}
