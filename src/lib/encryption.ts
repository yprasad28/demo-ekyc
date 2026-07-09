import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "securekyc-32-byte-demo-key-12345";

function getKey(): Buffer {
  const key = Buffer.from(ENCRYPTION_KEY, "utf-8");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be exactly 32 bytes");
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
  if (ivHex === undefined || authTagHex === undefined || encryptedHex === undefined) {
    throw new Error("Invalid ciphertext format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf-8");
}

export function encryptIfNotNull(value: string | null): string | null {
  if (value === null) return null;
  return encrypt(value);
}

export function decryptIfNotNull(value: string | null): string | null {
  if (value === null) return null;
  try {
    return decrypt(value);
  } catch {
    return value;
  }
}

export function hashForLookup(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
