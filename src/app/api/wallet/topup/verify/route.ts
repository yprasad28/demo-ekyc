import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomerAuth, getClientIp } from "@/lib/auth";
import { createPaymentProvider } from "@/features/wallet/providers/factory";
import { WalletVerifySchema } from "@/lib/validators";

/**
 * POST /api/wallet/topup/verify
 *
 * Verifies payment from Razorpay Checkout callback and credits wallet.
 *
 * THIS IS THE MOST CRITICAL ROUTE.
 *
 * Flow:
 * 1. Authenticate customer
 * 2. Validate payment signature (HMAC-SHA256)
 * 3. Check if already credited (idempotency)
 * 4. Credit wallet (atomic)
 * 5. Create audit trail
 *
 * Failure scenarios handled:
 * - Invalid signature → reject, don't credit
 * - Double request → already credited, return success
 * - Razorpay order not found → reject
 * - Amount mismatch → reject (PAY-03: server-controlled amount)
 */
export async function POST(req: NextRequest) {
  try {
    // Step 1: Authenticate (SEC-01: derive user from JWT)
    const auth = requireCustomerAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { customerId } = auth;

    // Step 2: Parse and validate request
    const body = await req.json();
    const parsed = WalletVerifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

    // Step 3: Verify signature (SEC-03: validate before any wallet change)
    const provider = createPaymentProvider();
    const verification = await provider.verifyPayment(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!verification.verified) {
      console.error(`[wallet-verify] ❌ Signature INVALID for order: ${razorpayOrderId}`);
      return NextResponse.json(
        { error: "Payment verification failed. Please try again." },
        { status: 400 }
      );
    }

    // Step 4: Find order in DB
    const order = await db.findPaymentOrderById(razorpayOrderId);
    if (!order) {
      console.error(`[wallet-verify] ❌ Order not found: ${razorpayOrderId}`);
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    // Step 5: Verify amount matches (PAY-03: server-controlled amount)
    if (verification.amount !== order.amount) {
      console.error(`[wallet-verify] ❌ Amount mismatch: expected ${order.amount}, got ${verification.amount}`);
      return NextResponse.json(
        { error: "Payment amount mismatch." },
        { status: 400 }
      );
    }

    // Step 6: Idempotency — check if already credited (PAY-01: prevent double credit)
    if (order.walletCredited) {
      console.log(`[wallet-verify] ✅ Already credited: ${razorpayOrderId}`);
      return NextResponse.json({
        success: true,
        message: "Wallet already credited.",
        orderId: razorpayOrderId,
      });
    }

    // Step 7: Verify payment status
    if (verification.status !== "captured") {
      // Payment not captured yet — update order status
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

    // Step 8: Credit wallet (atomic — WAL-01: concurrent safety)
    const wallet = await db.findOrCreateWallet(customerId);
    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found." },
        { status: 404 }
      );
    }

    // Atomic credit — single DB operation
    const updatedWallet = await db.creditWalletBalance(wallet.id, order.amount);
    if (!updatedWallet) {
      console.error(`[wallet-verify] ❌ Failed to credit wallet for order: ${razorpayOrderId}`);
      return NextResponse.json(
        { error: "Failed to credit wallet." },
        { status: 500 }
      );
    }

    // Step 9: Record transaction (DB-01: ledger + balance must agree)
    await db.createWalletTransaction(
      wallet.id,
      "TOPUP",
      order.amount,
      updatedWallet.balance,
      razorpayOrderId,
      `Wallet top-up via Razorpay`,
      JSON.stringify({ razorpayPaymentId, razorpayOrderId })
    );

    // Step 10: Mark order as credited (PAY-01: prevent double-credit on webhook)
    await db.markWalletCredited(order.id);

    // Step 11: Audit log
    const ipAddress = getClientIp(req);
    await db.createAuditLog(
      customerId,
      "WALLET_CREDITED",
      `₹${order.amount / 100} credited. Order: ${razorpayOrderId}, Payment: ${razorpayPaymentId}`,
      ipAddress
    );

    console.log(`[wallet-verify] ✅ Wallet credited: ₹${order.amount / 100} for order ${razorpayOrderId}`);

    return NextResponse.json({
      success: true,
      message: `₹${order.amount / 100} credited to wallet.`,
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
