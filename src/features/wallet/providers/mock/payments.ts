import type { PaymentProvider, CreateOrderResult, VerifyPaymentResult } from "../interfaces";

/**
 * Mock Payment Provider
 *
 * Simulates Razorpay behavior for development and testing.
 * - Creates fake order IDs
 * - Returns success after delay
 * - No real money involved
 *
 * Why?
 * - Develop without Razorpay credentials
 * - Test failure scenarios (simulated by amount patterns)
 * - Run in CI/CD without external dependencies
 */
export class MockPaymentProvider implements PaymentProvider {
  async createOrder(
    amount: number,
    receipt: string,
    metadata?: Record<string, string>
  ): Promise<CreateOrderResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const orderId = `order_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    console.log(`[mock-payment] Order created: ${orderId} for ₹${amount / 100}`);

    return {
      orderId,
      amount,
      currency: "INR",
      keyId: "rzp_test_mock_key",
    };
  }

  async verifyPayment(
    orderId: string,
    paymentId: string,
    _signature: string
  ): Promise<VerifyPaymentResult> {
    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 50));

    // Simulate failure: amount ending in 99 fails
    // This lets you test failure scenarios in development
    if (orderId.includes("_fail_")) {
      console.log(`[mock-payment] Verification FAILED for order: ${orderId}`);
      return {
        verified: false,
        orderId,
        paymentId: paymentId || "pay_mock_failed",
        amount: 0,
        status: "failed",
      };
    }

    console.log(`[mock-payment] Verification SUCCESS for order: ${orderId}`);

    return {
      verified: true,
      orderId,
      paymentId: paymentId || `pay_mock_${Date.now()}`,
      amount: 50000, // ₹500 mock amount
      status: "captured",
    };
  }

  verifyWebhookSignature(
    _rawBody: string | Buffer,
    _signature: string
  ): boolean {
    // Mock always passes signature verification
    return true;
  }

  async fetchPayment(paymentId: string) {
    return {
      id: paymentId,
      amount: 50000,
      status: "captured",
      orderId: "order_mock_fetched",
    };
  }
}
