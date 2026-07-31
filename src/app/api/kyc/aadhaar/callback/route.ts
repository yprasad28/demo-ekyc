import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/auth";
import {
  parseUIStreamCallback,
  type UIStreamCallbackPayload,
} from "@/features/kyc/providers/decentro/aadhaar";
import { getDigiLockerSession, removeDigiLockerSession } from "@/lib/digilocker-session-store";

export async function POST(req: NextRequest) {
  try {
    const payload: UIStreamCallbackPayload = await req.json();

    console.log("[UIStream Callback] ===== POST RECEIVED =====");
    console.log("[UIStream Callback] txnId:", payload.initialDecentroTxnId);
    console.log("[UIStream Callback] status:", payload.status);
    console.log("[UIStream Callback] full payload keys:", Object.keys(payload));
    if (payload.data?.AADHAAR) {
      console.log("[UIStream Callback] Aadhaar data present:", !!payload.data.AADHAAR.data);
      console.log("[UIStream Callback] Aadhaar name:", payload.data.AADHAAR.data?.proofOfIdentity?.name);
    } else {
      console.log("[UIStream Callback] NO Aadhaar data in payload!");
      console.log("[UIStream Callback] payload.data:", JSON.stringify(payload.data));
    }

    const customerId = await getDigiLockerSession(payload.initialDecentroTxnId);

    if (!customerId) {
      console.error("[UIStream Callback] No customer found for txnId:", payload.initialDecentroTxnId);
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (payload.status !== "SUCCESS") {
      console.error("[UIStream Callback] Failed:", payload.status, payload.message);
      return NextResponse.json({ error: payload.message || "DigiLocker verification failed" }, { status: 400 });
    }

    const aadhaarData = parseUIStreamCallback(payload);
    if (!aadhaarData) {
      console.error("[UIStream Callback] Could not parse Aadhaar data");
      return NextResponse.json({ error: "Failed to parse Aadhaar data" }, { status: 400 });
    }

    const application = await db.findApplicationByCustomerId(customerId);
    if (!application) {
      console.error("[UIStream Callback] Application not found for customer:", customerId);
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
      currentStep: 6,
    });

    const ipAddress = getClientIp(req);
    await db.createAuditLog(
      customerId,
      "AADHAAR_VERIFIED_DIGILOCKER",
      `Aadhaar verified via DigiLocker UIStream: ${aadhaarData.maskedAadhaar}`,
      ipAddress
    );

    await removeDigiLockerSession(payload.initialDecentroTxnId);

    console.log("[UIStream Callback] Aadhaar verified for customer:", customerId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[UIStream Callback] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
