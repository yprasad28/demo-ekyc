import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth, getClientIp } from "@/lib/auth";
import { createPaymentProvider } from "@/features/wallet/providers/factory";
import { WalletVerifySchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limiter";
import { PLATFORM_OWNER_ID } from "@/lib/constants";

/**
 * POST /api/wallet/topup/verify
 *
 * Verifies payment from Razorpay Checkout callback and credits platform wallet.
 * Admin authentication required.
 *
 * Flow:
 * 1. Authenticate admin
 * 2. Validate payment signature (HMAC-SHA256)
 * 3. Check if already credited (idempotency)
 * 4. Credit wallet (atomic)
 * 5. Create audit trail
 */
export async function POST(req: NextRequest) {
  try {
    const auth = requireAdminAuth(req);
    if (auth instanceof NextResponse) return auth;

    const limiter = rateLimit(`wallet-verify:${PLATFORM_OWNER_ID}`, 10, 15 * 60 * 1000);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = WalletVerifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

    const provider = createPaymentProvider();
    const verification = await provider.verifyPayment(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!verification.verified) {
      console.error(`[wallet-verify] Signature INVALID for order: ${razorpayOrderId}`);
      return NextResponse.json(
        { error: "Payment verification failed. Please try again." },
        { status: 400 }
      );
    }

    const order = await db.findPaymentOrderById(razorpayOrderId);
    if (!order) {
      console.error(`[wallet-verify] Order not found: ${razorpayOrderId}`);
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    // VULN-06 FIX: Ownership validation — ensure order belongs to platform owner
    if (order.customerId !== PLATFORM_OWNER_ID) {
      console.error(`[wallet-verify] BOLA attempt: order belongs to ${order.customerId}, requested by ${PLATFORM_OWNER_ID}`);
      return NextResponse.json(
        { error: "Unauthorized to verify this order." },
        { status: 403 }
      );
    }

    if (verification.amount !== order.amount) {
      console.error(`[wallet-verify] Amount mismatch: expected ${order.amount}, got ${verification.amount}`);
      return NextResponse.json(
        { error: "Payment amount mismatch." },
        { status: 400 }
      );
    }

    if (order.walletCredited) {
      console.log(`[wallet-verify] Already credited: ${razorpayOrderId}`);
      return NextResponse.json({
        success: true,
        message: "Wallet already credited.",
        orderId: razorpayOrderId,
      });
    }

    if (verification.status !== "captured") {
      await db.updatePaymentOrder(order.id, {
        status: "PAYMENT_RECEIVED",
        razorpayPaymentId: razorpayPaymentId,
      });

      return NextResponse.json({
        success: true,
        message: "Payment received, waiting for capture.",
        orderId: razorpayOrderId,
      });
    }

    const wallet = await db.findOrCreateWallet(PLATFORM_OWNER_ID);
    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found." },
        { status: 404 }
      );
    }

    const updatedWallet = await db.creditWalletBalance(wallet.id, order.amount);
    if (!updatedWallet) {
      console.error(`[wallet-verify] Failed to credit wallet for order: ${razorpayOrderId}`);
      return NextResponse.json(
        { error: "Failed to credit wallet." },
        { status: 500 }
      );
    }

    await db.createWalletTransaction(
      wallet.id,
      "TOPUP",
      order.amount,
      updatedWallet.balance,
      razorpayOrderId,
      `Platform wallet top-up via Razorpay`,
      JSON.stringify({ razorpayPaymentId, razorpayOrderId })
    );

    await db.markWalletCredited(order.id);

    const ipAddress = getClientIp(req);
    await db.createAuditLog(
      PLATFORM_OWNER_ID,
      "PLATFORM_WALLET_CREDITED",
      `₹${order.amount / 100} credited. Order: ${razorpayOrderId}, Payment: ${razorpayPaymentId}`,
      ipAddress
    );

    console.log(`[wallet-verify] Platform wallet credited: ₹${order.amount / 100} for order ${razorpayOrderId}`);

    return NextResponse.json({
      success: true,
      message: `₹${order.amount / 100} credited to platform wallet.`,
      balance: updatedWallet.balance,
      balanceFormatted: updatedWallet.balance / 100,
    });
  } catch (error) {
    console.error("[wallet-verify] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
