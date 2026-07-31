import { db } from "./db";

export async function storeDigiLockerSession(decentroTxnId: string, customerId: string): Promise<void> {
  const app = await db.findApplicationByCustomerId(customerId);
  if (app) {
    await db.updateApplication(app.id, { decentroTxnId });
  }
}

export async function getDigiLockerSession(decentroTxnId: string): Promise<string | undefined> {
  const app = await db.findApplicationByDecentroTxnId(decentroTxnId);
  return app?.customerId;
}

export async function removeDigiLockerSession(decentroTxnId: string): Promise<void> {
  const app = await db.findApplicationByDecentroTxnId(decentroTxnId);
  if (app) {
    await db.updateApplication(app.id, { decentroTxnId: null });
  }
}
