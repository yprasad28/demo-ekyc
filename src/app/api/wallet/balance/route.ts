import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomerAuth } from "@/lib/auth";

/**
 * GET /api/wallet/balance
 *
 * Returns the authenticated customer's wallet balance and free credits.
 *
 * Response:
 * {
 *   success: true,
 *   balance: 50000,         // ₹500 in paise
 *   balanceFormatted: 500,  // ₹500 human-readable
 *   freeCredits: {
 *     pan: 5,
 *     creditScore: 5,
 *     aadhaar: 5,
 *   },
 *   lowBalance: false,       // true if balance < ₹100
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // Step 1: Authenticate (SEC-01: never trust client user ID)
    const auth = requireCustomerAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { customerId } = auth;

    // Step 2: Get or create wallet
    const wallet = await db.findOrCreateWallet(customerId);

    // Step 3: Format response
    return NextResponse.json({
      success: true,
      balance: wallet.balance,
      balanceFormatted: wallet.balance / 100, // Convert paise to rupees
      freeCredits: {
        pan: wallet.freePan,
        creditScore: wallet.freeCreditScore,
        aadhaar: wallet.freeAadhaar,
      },
      lowBalance: wallet.balance < 10000, // Below ₹100
    });
  } catch (error) {
    console.error("[wallet-balance] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
