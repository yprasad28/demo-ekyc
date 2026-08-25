import { db } from "./db";
import { KYC_PRICING } from "./constants";

type ServiceType = "PAN" | "AADHAAR" | "CREDIT_SCORE";

const PRICING_KEY: Record<ServiceType, keyof typeof KYC_PRICING> = {
  PAN: "PAN_BASIC",
  AADHAAR: "AADHAAR",
  CREDIT_SCORE: "CREDIT_SCORE",
};

interface DeductionResult {
  success: boolean;
  error?: string;
  usedFreeCredit?: boolean;
  walletId?: string;
  newBalance?: number;
}

interface RefundResult {
  success: boolean;
  error?: string;
}

/**
 * Deduct wallet balance (or free credit) before a KYC verification.
 *
 * Flow:
 * 1. Find or create wallet
 * 2. Try free credit first (PAN: 5, Aadhaar: 5, Credit Score: 5)
 * 3. If no free credit → deduct from balance
 * 4. If insufficient balance → return error with 402 status message
 * 5. Record transaction for audit trail
 */
export async function deductForVerification(
  customerId: string,
  serviceType: ServiceType
): Promise<DeductionResult> {
  try {
    const wallet = await db.findOrCreateWallet(customerId);
    if (!wallet) {
      return { success: false, error: "Wallet not found." };
    }

    // Step 1: Try free credit first
    const usedFree = await db.useFreeCredit(customerId, serviceType);
    if (usedFree) {
      await db.createWalletTransaction(
        wallet.id,
        "FREE_CREDIT_USE",
        0,
        wallet.balance,
        null,
        `Free ${serviceType} verification`,
        null
      );
      return { success: true, usedFreeCredit: true, walletId: wallet.id, newBalance: wallet.balance };
    }

    // Step 2: Deduct from balance
    const pricingKey = PRICING_KEY[serviceType];
    const priceInPaise = KYC_PRICING[pricingKey].price * 100;
    const updatedWallet = await db.deductWalletBalance(wallet.id, priceInPaise);

    if (!updatedWallet) {
      return {
        success: false,
        error: `Insufficient balance. Required ₹${KYC_PRICING[pricingKey].price} for ${KYC_PRICING[pricingKey].label}. Please top up your wallet.`,
      };
    }

    // Step 3: Record transaction
    await db.createWalletTransaction(
      wallet.id,
      "KYC_DEDUCTION",
      -priceInPaise,
      updatedWallet.balance,
      null,
      `${KYC_PRICING[pricingKey].label} verification`,
      null
    );

    return {
      success: true,
      usedFreeCredit: false,
      walletId: wallet.id,
      newBalance: updatedWallet.balance,
    };
  } catch (error) {
    console.error(`[wallet-deduction] Error for ${serviceType}:`, error);
    return { success: false, error: "Wallet deduction failed. Please try again." };
  }
}

/**
 * Refund wallet after a failed KYC verification.
 *
 * If free credit was used → restore it
 * If balance was deducted → credit it back
 * Record refund transaction for audit trail
 */
export async function refundForVerification(
  customerId: string,
  serviceType: ServiceType,
  usedFreeCredit: boolean
): Promise<RefundResult> {
  try {
    const wallet = await db.findOrCreateWallet(customerId);
    if (!wallet) {
      return { success: false, error: "Wallet not found for refund." };
    }

    if (usedFreeCredit) {
      await db.restoreFreeCredit(customerId, serviceType);
      await db.createWalletTransaction(
        wallet.id,
        "FREE_CREDIT_RESTORE",
        0,
        wallet.balance,
        null,
        `Restored free ${serviceType} credit (verification failed)`,
        null
      );
    } else {
      const pricingKey = PRICING_KEY[serviceType];
      const priceInPaise = KYC_PRICING[pricingKey].price * 100;
      const refundedWallet = await db.creditWalletBalance(wallet.id, priceInPaise);

      if (refundedWallet) {
        await db.createWalletTransaction(
          wallet.id,
          "KYC_REFUND",
          priceInPaise,
          refundedWallet.balance,
          null,
          `Refund: ${KYC_PRICING[pricingKey].label} verification failed`,
          null
        );
      }
    }

    return { success: true };
  } catch (error) {
    console.error(`[wallet-refund] Error for ${serviceType}:`, error);
    return { success: false, error: "Wallet refund failed. Please contact support." };
  }
}
