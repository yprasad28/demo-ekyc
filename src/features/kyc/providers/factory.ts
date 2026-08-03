import type { AadhaarProvider } from "./interfaces";
import { MockAadhaarProvider } from "./mock/aadhaar";
import { SurepassAadhaarProvider } from "./surepass/aadhaar";

export function createAadhaarProvider(): AadhaarProvider {
  const provider = process.env.AADHAAR_PROVIDER || "mock";

  switch (provider) {
    case "surepass":
      return new SurepassAadhaarProvider();
    default:
      return new MockAadhaarProvider();
  }
}
