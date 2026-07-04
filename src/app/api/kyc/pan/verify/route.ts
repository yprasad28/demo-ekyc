import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPanRecord, fuzzyNameMatch } from "@/lib/mock-pan";
import { PAN_REGEX, NAME_MATCH_GOOD_THRESHOLD, DOB_MISMATCH_PENALTY } from "@/lib/constants";
import { requireCustomerAuth, getClientIp } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = requireCustomerAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { customerId } = auth;

    const body = await req.json();
    const { panNumber, dob } = body;

    if (!panNumber) return NextResponse.json({ error: "PAN number is required." }, { status: 400 });

    if (!PAN_REGEX.test(panNumber.toUpperCase())) {
      return NextResponse.json({ error: "Invalid PAN format. Expected format: ABCDE1234F" }, { status: 400 });
    }

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
