import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPanRecord, fuzzyNameMatch } from "@/lib/mock-pan";
import { NAME_MATCH_GOOD_THRESHOLD, DOB_MISMATCH_PENALTY } from "@/lib/constants";
import { requireCustomerAuth, getClientIp } from "@/lib/auth";
import { PanVerifySchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const auth = requireCustomerAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { customerId } = auth;

    const body = await req.json();
    const parsed = PanVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { panNumber, dob } = parsed.data;

    const panData = verifyPanRecord(panNumber);
    if (!panData) {
      return NextResponse.json({
        error: "PAN not found in NSDL database.",
        code: "PAN_NOT_FOUND",
      }, { status: 404 });
    }

    let dobMatch = true;
    if (dob && panData.dob !== dob) {
      dobMatch = false;
    }

    const application = await db.findApplicationByCustomerId(customerId);
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    let matchScore = 0;
    let nameMatchWarning = false;

    if (application.aadhaarName) {
      matchScore = fuzzyNameMatch(panData.name, application.aadhaarName);
      if (!dobMatch) {
        matchScore = Math.max(0, matchScore - DOB_MISMATCH_PENALTY);
      }
      nameMatchWarning = matchScore < NAME_MATCH_GOOD_THRESHOLD || !dobMatch;
    }

    await db.updateApplication(application.id, {
      panNumber: panData.panNumber,
      panName: panData.name,
      panDob: panData.dob,
      panType: panData.panType,
      panMatchScore: matchScore,
      panStatus: panData.status,
      currentStep: 4,
    });

    const ipAddress = getClientIp(req);
    await db.createAuditLog(customerId, "PAN_VERIFIED", `PAN ${panData.panNumber} verified, match score: ${matchScore}%`, ipAddress);

    return NextResponse.json({
      success: true,
      panData: {
        panNumber: panData.panNumber,
        name: panData.name,
        dob: panData.dob,
        status: panData.status,
        panType: panData.panType,
      },
      matchScore,
      nameMatchWarning,
      dobMatch,
      aadhaarName: application.aadhaarName,
    });
  } catch (error) {
    console.error("Error in pan verify:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
