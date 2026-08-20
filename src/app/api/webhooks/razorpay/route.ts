import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createPaymentProvider } from "@/features/wallet/providers/factory";

/**
 * POST /api/webhooks/razorpay
 *
 * Handles Razorpay webhook events.
 *
 * IMPORTANT: This route uses raw body for signature verification.
 * Next.js API routes parse JSON by default, but we need the raw bytes.
 * We use `req.text()` to get the raw body.
 *
 * Why webhooks matter:
 * - 3-5% of users close browser before checkout callback fires
 * - Webhooks are Razorpay's way of telling you "payment happened"
 * - Must be idempotent (same event can arrive multiple times)
 *
 * Events handled:
 * - payment.captured: Payment successfully captured → credit wallet
 * - payment.failed: Payment failed → update order status
 * - refund.created: Refund initiated → process refund
 * - order.paid: Order fully paid → belt-and-suspenders credit
 */

// Force Node.js runtime (required for raw body handling)
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Step 1: Get raw body (CRITICAL for signature verification)
    // Do NOT use req.json() — it parses the body and changes bytes
    const rawBody = await req.text();

    // Step 2: Get signature header
    const signature = req.headers.get("x-razorpay-signature");
    if (!signature) {
      console.error("[webhook] ❌ Missing signature header");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // Step 3: Verify signature (SEC-02: never trust unsigned webhooks)
    const provider = createPaymentProvider();
    const isValid = provider.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      console.error("[webhook] ❌ Invalid signature — possible spoofed webhook");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Step 4: Parse event
    const event = JSON.parse(rawBody);
    const eventId = event.id;
    const eventType = event.event;

    console.log(`[webhook] 📨 Event: ${eventType} (ID: ${eventId})`);

    // Step 5: Deduplicate (WEB-02: same event can arrive multiple times)
    const existingEvent = await db.findWebhookEventByEventId(eventId);
    if (existingEvent?.processed) {
      console.log(`[webhook] ⏭️ Already processed: ${eventId}`);
      return NextResponse.json({ received: true });
    }

    // Step 6: Store event (for audit and dedup)
    if (!existingEvent) {
      await db.createWebhookEvent(eventId, eventType, rawBody);
    }

    // Step 7: Process event
    try {
      await processEvent(eventType, event);
      await db.markWebhookEventProcessed(eventId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`[webhook] ❌ Processing error: ${errorMessage}`);
      await db.markWebhookEventProcessed(eventId, errorMessage);
    }

    // Always return 200 to Razorpay (they retry on non-200)
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhook] ❌ Unexpected error:", error);
    // Still return 200 to prevent Razorpay retries on parse errors
    return NextResponse.json({ received: true });
  }
}

/**
 * Process webhook event by type
 *
 * Each event type has its own handler.
 * All handlers are idempotent — safe to run multiple times.
 */
async function processEvent(eventType: string, event: { payload: Record<string, { entity: Record<string, unknown> }> }) {
  switch (eventType) {
    case "payment.captured": {
      const payment = event.payload.payment.entity;
      await handlePaymentCaptured(payment);
      break;
    }

    case "payment.failed": {
      const payment = event.payload.payment.entity;
      await handlePaymentFailed(payment);
      break;
    }

    case "order.paid": {
      const order = event.payload.order.entity;
      await handleOrderPaid(order);
      break;
    }

    case "refund.created":
    case "refund.processed": {
      const refund = event.payload.refund.entity;
      await handleRefund(refund);
      break;
    }

    default:
      console.log(`[webhook] ⏭️ Unhandled event type: ${eventType}`);
  }
}

/**
 * Handle payment.captured event
 *
 * This is the safety net for missed browser callbacks.
 * Checks if wallet was already credited before crediting.
 */
async function handlePaymentCaptured(payment: Record<string, unknown>) {
  const paymentId = payment.id as string;
  const orderId = payment.order_id as string;
  const amount = payment.amount as number;

  console.log(`[webhook] 💰 Payment captured: ${paymentId} for order ${orderId}`);

  // Find order in DB
  const order = await db.findPaymentOrderById(orderId);
  if (!order) {
    console.error(`[webhook] ❌ Order not found for payment: ${paymentId}`);
    return;
  }

  // Idempotency: check if already credited (PAY-01: prevent double credit)
  if (order.walletCredited) {
    console.log(`[webhook] ✅ Already credited: ${orderId}`);
    return;
  }

  // Verify amount matches
  if (amount !== order.amount) {
    console.error(`[webhook] ❌ Amount mismatch: expected ${order.amount}, got ${amount}`);
    return;
  }

  // Credit wallet
  const wallet = await db.findOrCreateWallet(order.customerId);
  if (!wallet) {
    console.error(`[webhook] ❌ Wallet not found for customer: ${order.customerId}`);
    return;
  }

  const updatedWallet = await db.creditWalletBalance(wallet.id, order.amount);
  if (!updatedWallet) {
    console.error(`[webhook] ❌ Failed to credit wallet for order: ${orderId}`);
    return;
  }

  // Record transaction
  await db.createWalletTransaction(
    wallet.id,
    "TOPUP",
    order.amount,
    updatedWallet.balance,
    orderId,
    "Wallet top-up via Razorpay (webhook)",
    JSON.stringify({ razorpayPaymentId: paymentId, source: "webhook" })
  );

  // Mark as credited
  await db.markWalletCredited(order.id);

  // Audit log
  await db.createAuditLog(
    order.customerId,
    "WALLET_CREDITED_WEBHOOK",
    `₹${order.amount / 100} credited via webhook. Order: ${orderId}`,
    "webhook"
  );

  console.log(`[webhook] ✅ Wallet credited via webhook: ₹${order.amount / 100}`);
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(payment: Record<string, unknown>) {
  const paymentId = payment.id as string;
  const orderId = payment.order_id as string;
  const errorDescription = payment.error_description as string || "Payment failed";

  console.log(`[webhook] ❌ Payment failed: ${paymentId} for order ${orderId}`);

  const order = await db.findPaymentOrderById(orderId);
  if (!order) return;

  await db.updatePaymentOrder(order.id, {
    status: "FAILED",
    failureReason: errorDescription,
    razorpayPaymentId: paymentId,
  });
}

/**
 * Handle order.paid event (belt-and-suspenders)
 */
async function handleOrderPaid(order: Record<string, unknown>) {
  const orderId = order.id as string;
  console.log(`[webhook] 📦 Order paid: ${orderId}`);

  // Same logic as payment.captured — ensure wallet is credited
  const dbOrder = await db.findPaymentOrderById(orderId);
  if (!dbOrder || dbOrder.walletCredited) return;

  // Find the payment for this order
  if (dbOrder.razorpayPaymentId) {
    const provider = createPaymentProvider();
    const payment = await provider.fetchPayment(dbOrder.razorpayPaymentId);
    if (payment.status === "captured") {
      await handlePaymentCaptured({
        id: payment.id,
        order_id: orderId,
        amount: payment.amount,
      });
    }
  }
}

/**
 * Handle refund events
 */
async function handleRefund(refund: Record<string, unknown>) {
  const paymentId = refund.payment_id as string;
  const amount = refund.amount as number;

  console.log(`[webhook] 💸 Refund: ${amount} for payment ${paymentId}`);

  const order = await db.findPaymentOrderByPaymentId(paymentId);
  if (!order) return;

  const wallet = await db.findOrCreateWallet(order.customerId);
  if (!wallet) return;

  // Credit refund to wallet
  const updatedWallet = await db.creditWalletBalance(wallet.id, amount);
  if (!updatedWallet) return;

  // Record transaction
  await db.createWalletTransaction(
    wallet.id,
    "TOPUP_REFUND",
    amount,
    updatedWallet.balance,
    paymentId,
    "Refund processed via Razorpay",
    JSON.stringify({ source: "webhook" })
  );
}
