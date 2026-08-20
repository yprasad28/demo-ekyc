import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomerAuth } from "@/lib/auth";
import { FREE_CREDITS } from "@/lib/constants";

/**
 * GET /api/wallet/credits
 *
 * Returns remaining free credits for each KYC service.
 *
 * Response:
 * {
 *   success: true,
 *   credits: {
 *     pan: { remaining: 5, total: 5 },
 *     creditScore: { remaining: 5, total: 5 },
 *     aadhaar: { remaining: 5, total: 5 },
 *   },
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const auth = requireCustomerAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { customerId } = auth;

    const wallet = await db.findOrCreateWallet(customerId);

    return NextResponse.json({
      success: true,
      credits: {
        pan: {
          remaining: wallet.freePan,
          total: FREE_CREDITS.PAN,
        },
        creditScore: {
          remaining: wallet.freeCreditScore,
          total: FREE_CREDITS.CREDIT_SCORE,
        },
        aadhaar: {
          remaining: wallet.freeAadhaar,
          total: FREE_CREDITS.AADHAAR,
        },
      },
    });
  } catch (error) {
    console.error("[wallet-credits] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
