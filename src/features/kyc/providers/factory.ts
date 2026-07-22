import type { AadhaarProvider, DigiLockerProvider, PanProvider } from "./interfaces";
import { MockAadhaarProvider } from "./mock/aadhaar";
import { MockPanProvider } from "./mock/pan";
import { DecentroPanProvider } from "./decentro/pan";
import { DecentroDigiLockerProvider } from "./decentro/aadhaar";
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

export function createDigiLockerProvider(): DigiLockerProvider {
  return new DecentroDigiLockerProvider();
}

export function createPanProvider(): PanProvider {
  const provider = process.env.PAN_PROVIDER || "mock";

  switch (provider) {
    case "decentro":
      return new DecentroPanProvider();
    default:
      return new MockPanProvider();
  }
}
