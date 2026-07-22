import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomerAuth, getClientIp } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limiter";
import { DecentroDigiLockerProvider } from "@/features/kyc/providers/decentro/aadhaar";
import { z } from "zod";

const provider = new DecentroDigiLockerProvider();

const DigiLockerVerifySchema = z.object({
  txnId: z.string().min(1, "Transaction ID is required"),
  aadhaarNumber: z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits"),
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

    const maskedNumber =
      aadhaarData.maskedAadhaar ||
      aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, "XXXX XXXX $3");

    const application = await db.findApplicationByCustomerId(customerId);
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    await db.updateApplication(application.id, {
      aadhaarNumber: maskedNumber,
      aadhaarName: aadhaarData.name,
      aadhaarDob: aadhaarData.dob,
      aadhaarGender: aadhaarData.gender,
      aadhaarAddress: aadhaarData.address,
      aadhaarPhoto: aadhaarData.photo,
      status: "IN_PROGRESS",
      currentStep: 3,
    });

    const ipAddress = getClientIp(req);
    await db.createAuditLog(customerId, "AADHAAR_VERIFIED_DIGILOCKER", `Aadhaar verified via DigiLocker: ${maskedNumber}`, ipAddress);

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
    });
  } catch (error) {
    console.error("Error in DigiLocker verify:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
