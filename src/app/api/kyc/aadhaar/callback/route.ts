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
    if (payload.data?.PAN) {
      console.log("[UIStream Callback] PAN data present:", !!payload.data.PAN.data);
      console.log("[UIStream Callback] PAN name:", payload.data.PAN.data?.fullName);
      console.log("[UIStream Callback] PAN number:", payload.data.PAN.data?.idNumber);
    } else {
      console.log("[UIStream Callback] NO PAN data in payload");
    }
    if (payload.data?.NAME_MATCH) {
      console.log("[UIStream Callback] Name match:", payload.data.NAME_MATCH);
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

    const isPartialFetch = payload.responseKey === "success_uistream_partial_documents_fetch" ||
      payload.responseKey === "success_uistream_partial_fetch_with_poller";
    const panFailed = !aadhaarData.panData && (isPartialFetch || !!payload.data?.PAN?.message);

    let panError = null;
    if (panFailed) {
      panError = aadhaarData.panError || payload.data?.PAN?.message || "PAN data could not be retrieved from DigiLocker. Please try again.";
      console.error("[UIStream Callback] PAN fetch failed:", panError);
    }

    await db.updateApplication(application.id, {
      aadhaarNumber: aadhaarData.maskedAadhaar,
      aadhaarName: aadhaarData.name,
      aadhaarDob: aadhaarData.dob,
      aadhaarGender: aadhaarData.gender,
      aadhaarAddress: aadhaarData.address,
      aadhaarPhoto: aadhaarData.photo,
      panNumber: aadhaarData.panData?.panNumber || null,
      panName: aadhaarData.panData?.name || null,
      panDob: aadhaarData.panData?.dob || null,
      panStatus: aadhaarData.panData?.status || null,
      panType: aadhaarData.panData?.panType || null,
      panMatchScore: aadhaarData.nameMatchResult?.score || 0,
      panError: panError,
      status: "IN_PROGRESS",
      currentStep: 6,
    });

    const ipAddress = getClientIp(req);
    const panInfo = aadhaarData.panData ? ` | PAN: ${aadhaarData.panData.panNumber}` : (panFailed ? " | PAN: FAILED" : "");
    const matchInfo = aadhaarData.nameMatchResult ? ` | Match: ${aadhaarData.nameMatchResult.score}%` : "";
    await db.createAuditLog(
      customerId,
      "AADHAAR_VERIFIED_DIGILOCKER",
      `Aadhaar verified via DigiLocker UIStream: ${aadhaarData.maskedAadhaar}${panInfo}${matchInfo}${panFailed ? ` | PAN Error: ${panError}` : ""}`,
      ipAddress
    );

    await removeDigiLockerSession(payload.initialDecentroTxnId);

    console.log("[UIStream Callback] Aadhaar verified for customer:", customerId);
    if (aadhaarData.panData) {
      console.log("[UIStream Callback] PAN verified:", aadhaarData.panData.panNumber);
    } else {
      console.log("[UIStream Callback] PAN not available, panError:", panError);
    }
    if (aadhaarData.nameMatchResult) {
      console.log("[UIStream Callback] Name match score:", aadhaarData.nameMatchResult.score);
    }

    return NextResponse.json({ success: true, panFailed, panError });
  } catch (error) {
    console.error("[UIStream Callback] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
