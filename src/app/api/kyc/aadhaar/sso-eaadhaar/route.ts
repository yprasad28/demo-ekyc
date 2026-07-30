import { NextRequest, NextResponse } from "next/server";
import { requireCustomerAuth, getClientIp } from "@/lib/auth";
import { generateAccessToken, fetchSSOeAadhaar } from "@/features/kyc/providers/decentro/digilocker-sso";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const auth = requireCustomerAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { customerId } = auth;

    const { txnId, code } = await req.json();
    if (!txnId) {
      return NextResponse.json({ error: "txnId is required" }, { status: 400 });
    }
    if (!code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    console.log("[SSO eAadhaar] Generating access token for txnId:", txnId);
    await generateAccessToken(code, txnId);

    console.log("[SSO eAadhaar] Fetching eAadhaar for txnId:", txnId);

    const aadhaarData = await fetchSSOeAadhaar(txnId);

    if (!aadhaarData || !aadhaarData.name) {
      console.log("[SSO eAadhaar] No Aadhaar data returned");
      return NextResponse.json({ error: "Failed to fetch Aadhaar data from DigiLocker" }, { status: 400 });
    }

    console.log("[SSO eAadhaar] Got Aadhaar data for:", aadhaarData.name);

    const application = await db.findApplicationByCustomerId(customerId);
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    await db.updateApplication(application.id, {
      aadhaarNumber: aadhaarData.maskedAadhaar,
      aadhaarName: aadhaarData.name,
      aadhaarDob: aadhaarData.dob,
      aadhaarGender: aadhaarData.gender,
      aadhaarAddress: aadhaarData.address,
      aadhaarPhoto: aadhaarData.photo,
      status: "IN_PROGRESS",
      currentStep: 5,
    });

    const ipAddress = getClientIp(req);
    await db.createAuditLog(
      customerId,
      "AADHAAR_VERIFIED_SSO_DIGILOCKER",
      `Aadhaar verified via SSO DigiLocker: ${aadhaarData.maskedAadhaar}`,
      ipAddress
    );

    console.log("[SSO eAadhaar] Saved Aadhaar data for customer:", customerId);

    return NextResponse.json({ success: true, aadhaarData });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[SSO eAadhaar] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
