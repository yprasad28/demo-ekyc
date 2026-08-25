import type { PaymentProvider } from "./interfaces";
import { RazorpayPaymentProvider } from "./razorpay/payments";
import { MockPaymentProvider } from "./mock/payments";

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

let cachedProvider: PaymentProvider | null = null;

export function createPaymentProvider(): PaymentProvider {
  if (cachedProvider) return cachedProvider;

  const provider = process.env.WALLET_PROVIDER || "mock";

  if (provider === "razorpay") {
    cachedProvider = new RazorpayPaymentProvider();
  } else {
    cachedProvider = new MockPaymentProvider();
  }

  console.log(`[wallet] Using provider: ${provider}`);
  return cachedProvider;
}
