import { verifyPanRecord, type PanRecord } from "@/lib/mock-pan";
import type { PanProvider, PanProfile } from "../interfaces";

export class MockPanProvider implements PanProvider {
  async verifyPan(panNumber: string): Promise<PanProfile | null> {
    const record = verifyPanRecord(panNumber);
    if (!record) return null;

    return {
      panNumber: record.panNumber,
      name: record.name,
      dob: record.dob,
      status: record.status,
      panType: record.panType,
    };
  }
}
