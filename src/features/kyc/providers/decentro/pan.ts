import { decentroRequest } from "./client";
import type { PanProvider, PanProfile } from "../interfaces";

export class DecentroPanProvider implements PanProvider {
  async verifyPan(panNumber: string): Promise<PanProfile | null> {
    try {
      const response = await decentroRequest("/kyc/public_registry/validate", {
        reference_id: `PAN-${Date.now()}`,
        document_type: "PAN_DETAILED",
        id_number: panNumber.toUpperCase(),
        consent: "Y",
        consent_purpose: "KYC verification for eKYC demo project",
      });

      if (response.kycStatus !== "SUCCESS") {
        const errorMsg = response.error?.message || response.message || "Verification failed";
        console.error("[DECENTRO PAN] Verification failed:", errorMsg);
        return null;
      }

      const result = (response.result || response.data || {}) as Record<string, unknown>;

      return {
        panNumber: (result.id_number as string) || panNumber.toUpperCase(),
        name: (result.full_name as string) || (result.name as string) || "",
        dob: (result.dob as string) || (result.date_of_birth as string) || "",
        status: (result.status as string) || "VALID",
        panType: (result.category as string) || (result.type as string) || "INDIVIDUAL",
      };
    } catch (error) {
      console.error("[DECENTRO PAN] API call failed:", error);
      return null;
    }
  }
}
