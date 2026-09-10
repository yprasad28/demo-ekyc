import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomerAuth, getClientIp } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limiter";
import { DecentroDigiLockerProvider } from "@/features/kyc/providers/decentro/aadhaar";
import { fuzzyNameMatch, comprehensiveMatch } from "@/lib/mock-pan";
import { NAME_MATCH_GOOD_THRESHOLD, maskPan } from "@/lib/constants";
import { z } from "zod";

const provider = new DecentroDigiLockerProvider();

const DigiLockerVerifySchema = z.object({
  txnId: z.string().min(1, "Transaction ID is required"),
  aadhaarNumber: z.string().optional().default(""),
});

export async function POST(req: NextRequest) {
  try {
    const auth = requireCustomerAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { customerId } = auth;

    const body = await req.json();
    const parsed = DigiLockerVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { txnId, aadhaarNumber } = parsed.data;

    const limiter = rateLimit(`digilocker-verify:${customerId}`, 5, 10 * 60 * 1000);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": "600" } }
      );
    }

    const aadhaarData = await provider.fetchEaadhaar(txnId);
    if (!aadhaarData) {
      return NextResponse.json({
        error: "Failed to fetch Aadhaar data from DigiLocker.",
        code: "DIGILOCKER_FETCH_FAILED",
      }, { status: 400 });
    }

    // Also try to fetch PAN from DigiLocker (if linked to user's DigiLocker account)
    let panData = null;
    let panFetchError: string | null = null;
    try {
      panData = await provider.fetchPanFromDigiLocker(txnId);
    } catch (err) {
      panFetchError = err instanceof Error ? err.message : String(err);
      console.error("[DigiLocker] PAN fetch failed with error:", panFetchError);
    }
    console.log("[DigiLocker] PAN from DigiLocker:", panData ? "AVAILABLE" : "NOT AVAILABLE", panFetchError ? `(error: ${panFetchError})` : "");

    const maskedNumber =
      aadhaarData.maskedAadhaar ||
      aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, "XXXX XXXX $3");

    const application = await db.findApplicationByCustomerId(customerId);
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    const updateData: Record<string, unknown> = {
      aadhaarNumber: maskedNumber,
      aadhaarName: aadhaarData.name,
      aadhaarDob: aadhaarData.dob,
      aadhaarGender: aadhaarData.gender,
      aadhaarAddress: aadhaarData.address,
      aadhaarPhoto: aadhaarData.photo,
      status: "IN_PROGRESS",
      currentStep: 3,
    };

    // If PAN was fetched from DigiLocker, save it and compute name match
    let panMatchScore = 0;
    let panAutoPassed = false;
    let dobMatch = true;
    if (panData) {
      updateData.panNumber = panData.panNumber;
      updateData.panName = panData.name;
      updateData.panDob = panData.dob;
      updateData.panType = "DIGILOCKER";
      updateData.panStatus = panData.status;

      // Compute comprehensive match between Aadhaar and PAN
      const matchResult = comprehensiveMatch(
        { name: aadhaarData.name, dob: aadhaarData.dob, gender: aadhaarData.gender },
        { name: panData.name, dob: panData.dob, gender: panData.gender }
      );
      panMatchScore = matchResult.overallScore;
      dobMatch = matchResult.dobMatch;
      updateData.panMatchScore = panMatchScore;
      updateData.currentStep = 6;

      // If match is good, auto-pass and advance to step 7 (Credit Score)
      if (panMatchScore >= NAME_MATCH_GOOD_THRESHOLD) {
        updateData.currentStep = 7;
        panAutoPassed = true;
      }
    }

    await db.updateApplication(application.id, updateData);

    const ipAddress = getClientIp(req);
    await db.createAuditLog(customerId, "AADHAAR_VERIFIED_DIGILOCKER", `Aadhaar verified via DigiLocker: ${maskedNumber}${panData ? `, PAN also fetched: ${panData.panNumber}` : ""}`, ipAddress);

    return NextResponse.json({
      success: true,
      aadhaarData: {
        name: aadhaarData.name,
        dob: aadhaarData.dob,
        gender: aadhaarData.gender,
        address: aadhaarData.address,
        maskedAadhaar: maskedNumber,
        photo: aadhaarData.photo,
      },
      panFromDigiLocker: panData ? {
        panNumber: maskPan(panData.panNumber),
        name: panData.name,
        dob: panData.dob,
        gender: panData.gender,
        status: panData.status,
        matchScore: panMatchScore,
        dobMatch,
        autoPassed: panAutoPassed,
      } : null,
      panFetchError,
    });
  } catch (error) {
    console.error("Error in DigiLocker verify:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
