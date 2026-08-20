import type { PaymentProvider } from "./interfaces";

/**
 * Payment Provider Factory
 *
 * Switches between Razorpay and Mock provider based on WALLET_PROVIDER env var.
 * Same pattern used for Decentro providers in src/features/kyc/providers/factory.ts.
 *
 * Usage:
 *   const provider = createPaymentProvider();
 *   await provider.createOrder(amount, receipt);
 */

export function createPaymentProvider(): PaymentProvider {
  const provider = process.env.WALLET_PROVIDER || "mock";

  if (provider === "razorpay") {
    // Lazy import to avoid loading Razorpay SDK in mock mode
    const { RazorpayPaymentProvider } = require("./razorpay/payments");
    return new RazorpayPaymentProvider();
  }

  // Default: mock provider
  const { MockPaymentProvider } = require("./mock/payments");
  return new MockPaymentProvider();
}
