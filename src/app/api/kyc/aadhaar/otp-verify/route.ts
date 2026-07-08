import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyOTP } from "@/lib/mock-otp";
import { getAadhaarProfile } from "@/lib/mock-aadhaar";
import { requireCustomerAuth, getClientIp } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limiter";
import { AadhaarVerifySchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const auth = requireCustomerAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { customerId } = auth;

    const body = await req.json();
    const parsed = AadhaarVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { otp, aadhaarNumber } = parsed.data;

    const limiter = rateLimit(`aadhaar-otp-verify:${customerId}`, 5, 10 * 60 * 1000);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": "600" } }
      );
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
