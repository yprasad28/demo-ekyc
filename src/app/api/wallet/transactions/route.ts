import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth } from "@/lib/auth";
import { PLATFORM_OWNER_ID } from "@/lib/constants";

/**
 * GET /api/wallet/transactions
 *
 * Returns paginated transaction history for the platform owner's wallet.
 * Admin authentication required.
 *
 * Query params:
 *   limit  - Number of transactions to return (default: 20)
 *   offset - Number to skip (default: 0)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = requireAdminAuth(req);
    if (auth instanceof NextResponse) return auth;

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const wallet = await db.findOrCreateWallet(PLATFORM_OWNER_ID);
    const transactions = await db.getWalletTransactions(wallet.id, limit, offset);

    return NextResponse.json({
      success: true,
      transactions: transactions.map((tx: { id: string; type: string; amount: number; balanceAfter: number; description: string | null; referenceId: string | null; createdAt: string }) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        amountFormatted: tx.amount / 100,
        balanceAfter: tx.balanceAfter,
        balanceAfterFormatted: tx.balanceAfter / 100,
        description: tx.description,
        referenceId: tx.referenceId,
        createdAt: tx.createdAt,
      })),
      total: transactions.length,
    });
  } catch (error) {
    console.error("[wallet-transactions] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
