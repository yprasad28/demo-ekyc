const sessionStore = new Map<string, string>();

export function storeDigiLockerSession(decentroTxnId: string, customerId: string): void {
  sessionStore.set(decentroTxnId, customerId);
}

export function getDigiLockerSession(decentroTxnId: string): string | undefined {
  return sessionStore.get(decentroTxnId);
}

export function removeDigiLockerSession(decentroTxnId: string): void {
  sessionStore.delete(decentroTxnId);
}
