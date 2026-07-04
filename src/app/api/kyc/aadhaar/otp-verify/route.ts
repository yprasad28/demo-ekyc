import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyOTP } from "@/lib/mock-otp";
import { getAadhaarProfile } from "@/lib/mock-aadhaar";
import { requireCustomerAuth, getClientIp } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = requireCustomerAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { customerId } = auth;

    const body = await req.json();
    const { otp, aadhaarNumber } = body;

    if (!otp || !aadhaarNumber) {
      return NextResponse.json({ error: "OTP and Aadhaar number are required." }, { status: 400 });
    }

    const valid = verifyOTP(`aadhaar-${customerId}`, otp);
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired OTP." }, { status: 401 });
    }

    const aadhaarData = getAadhaarProfile(aadhaarNumber);
    if (!aadhaarData) {
      return NextResponse.json({
        error: "Aadhaar number not found in UIDAI records.",
        code: "AADHAAR_NOT_FOUND",
      }, { status: 404 });
    }

    const application = await db.findApplicationByCustomerId(customerId);
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    await db.updateApplication(application.id, {
      aadhaarNumber: aadhaarData.maskedAadhaar,
      aadhaarName: aadhaarData.name,
      aadhaarDob: aadhaarData.dob,
      aadhaarGender: aadhaarData.gender,
      aadhaarAddress: aadhaarData.address,
      aadhaarPhoto: aadhaarData.photo,
      status: "IN_PROGRESS",
      currentStep: 3,
    });

    const ipAddress = getClientIp(req);
    await db.createAuditLog(customerId, "AADHAAR_VERIFIED", `Aadhaar verified: ${aadhaarData.maskedAadhaar}`, ipAddress);

    return NextResponse.json({
      success: true,
      aadhaarData: {
        name: aadhaarData.name,
        dob: aadhaarData.dob,
        gender: aadhaarData.gender,
        address: aadhaarData.address,
        maskedAadhaar: aadhaarData.maskedAadhaar,
        photo: aadhaarData.photo,
      },
    });
  } catch (error) {
    console.error("Error in aadhaar otp-verify:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
