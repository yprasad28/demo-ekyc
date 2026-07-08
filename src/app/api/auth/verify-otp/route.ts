import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyOTP } from "@/lib/mock-otp";
import { JWT_SECRET, CUSTOMER_TOKEN_MAX_AGE, CUSTOMER_TOKEN_EXPIRY } from "@/lib/constants";
import { setAuthCookie, getClientIp } from "@/lib/auth";
import jwt from "jsonwebtoken";
import { MobileOtpSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = MobileOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { mobile, otp } = parsed.data;

    const valid = verifyOTP(mobile, otp);
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired OTP. Please try again." }, { status: 401 });
    }

    const customer = await db.findCustomerByMobile(mobile);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const application = await db.findApplicationByCustomerId(customer.id);

    const token = jwt.sign(
      { customerId: customer.id, mobile: mobile, role: "CUSTOMER" },
      JWT_SECRET,
      { expiresIn: CUSTOMER_TOKEN_EXPIRY }
    );

    const ipAddress = getClientIp(req);
    await db.createAuditLog(customer.id, "OTP_VERIFIED", `OTP verified for mobile ${mobile}`, ipAddress);

    const response = NextResponse.json({
      success: true,
      customer: { id: customer.id, mobile: mobile, email: customer.email },
      application: application ? { id: application.id, currentStep: application.currentStep, status: application.status } : null,
    });

    setAuthCookie(response, "kyc_token", token, CUSTOMER_TOKEN_MAX_AGE);

    return response;
  } catch (error) {
    console.error("Error in verify-otp:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
