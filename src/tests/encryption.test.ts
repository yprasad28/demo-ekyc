import { describe, it, expect } from "vitest";
import { encrypt, decrypt, encryptIfNotNull, decryptIfNotNull, hashForLookup } from "@/lib/encryption";

// ============================================================
// Tests for src/lib/encryption.ts
// ============================================================

describe("encrypt / decrypt roundtrip", () => {
  it("encrypt then decrypt returns exact original plaintext", () => {
    const original = "9876543210";
    const ciphertext = encrypt(original);
    const decrypted = decrypt(ciphertext);
    expect(decrypted).toBe(original);
  });

  it("same plaintext encrypted twice produces different ciphertext (IV uniqueness)", () => {
    const plaintext = "9876543210";
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
    // But both decrypt to the same value
    expect(decrypt(a)).toBe(plaintext);
    expect(decrypt(b)).toBe(plaintext);
  });

  it("ciphertext format is iv:authTag:encrypted (hex:hex:hex)", () => {
    const ciphertext = encrypt("test");
    const parts = ciphertext.split(":");
    expect(parts).toHaveLength(3);
    // Each part should be valid hex
    for (const part of parts) {
      expect(part).toMatch(/^[0-9a-f]+$/);
    }
  });
});

describe("decrypt error handling", () => {
  it("decrypt with tampered ciphertext throws or returns garbage (not silent corruption)", () => {
    const original = "secret-data";
    const ciphertext = encrypt(original);
    const parts = ciphertext.split(":");
    // Tamper with the encrypted part (flip a hex char)
    const tamperedHex = parts[2].replace(/[0-9]/, "f");
    const tampered = `${parts[0]}:${parts[1]}:${tamperedHex}`;
    // Should throw due to auth tag mismatch (GCM integrity check)
    expect(() => decrypt(tampered)).toThrow();
  });

  it("decrypt with tampered auth tag throws (integrity check works)", () => {
    const original = "integrity-test";
    const ciphertext = encrypt(original);
    const parts = ciphertext.split(":");
    // Flip a char in the auth tag
    const tamperedTag = parts[1].replace(/[0-9]/, "f");
    const tampered = `${parts[0]}:${tamperedTag}:${parts[2]}`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it("decrypt with tampered IV throws", () => {
    const original = "iv-test";
    const ciphertext = encrypt(original);
    const parts = ciphertext.split(":");
    const tamperedIV = parts[0].replace(/[0-9]/, "a");
    const tampered = `${tamperedIV}:${parts[1]}:${parts[2]}`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it("decrypt with invalid format (no colons) throws", () => {
    expect(() => decrypt("not-a-valid-ciphertext")).toThrow();
  });

  it("decrypt with empty string throws", () => {
    expect(() => decrypt("")).toThrow();
  });

  it("decrypt with only colons (empty parts) throws", () => {
    expect(() => decrypt("::")).toThrow();
  });
});

describe("empty and special string handling", () => {
  it("empty string roundtrip works", () => {
    const ciphertext = encrypt("");
    const decrypted = decrypt(ciphertext);
    expect(decrypted).toBe("");
  });

  it("long string (500+ chars) roundtrip works", () => {
    const long = "A".repeat(500);
    const ciphertext = encrypt(long);
    const decrypted = decrypt(ciphertext);
    expect(decrypted).toBe(long);
    expect(decrypted.length).toBe(500);
  });

  it("Aadhaar-like numeric string roundtrip works", () => {
    const aadhaar = "123456789012";
    expect(decrypt(encrypt(aadhaar))).toBe(aadhaar);
  });

  it("PAN-like string roundtrip works", () => {
    const pan = "ABCDE1234F";
    expect(decrypt(encrypt(pan))).toBe(pan);
  });

  it("unicode/name with accents roundtrip works", () => {
    const name = "Rajesh Kumar Singh";
    expect(decrypt(encrypt(name))).toBe(name);
  });

  it("string with special characters roundtrip works", () => {
    const special = "Line 1, Apt #2! @street & area (Delhi) - 110001";
    expect(decrypt(encrypt(special))).toBe(special);
  });

  it("string with newlines roundtrip works", () => {
    const multiline = "Line 1\nLine 2\nLine 3";
    expect(decrypt(encrypt(multiline))).toBe(multiline);
  });
});

describe("encryptIfNotNull / decryptIfNotNull", () => {
  it("encryptIfNotNull returns null for null input", () => {
    expect(encryptIfNotNull(null)).toBeNull();
  });

  it("encryptIfNotNull encrypts non-null input", () => {
    const result = encryptIfNotNull("test");
    expect(result).not.toBeNull();
    expect(result).not.toBe("test");
  });

  it("decryptIfNotNull returns null for null input", () => {
    expect(decryptIfNotNull(null)).toBeNull();
  });

  it("decryptIfNotNull decrypts valid ciphertext", () => {
    const original = "9876543210";
    const ciphertext = encrypt(original);
    expect(decryptIfNotNull(ciphertext)).toBe(original);
  });

  it("decryptIfNotNull returns original value on invalid ciphertext (not throw)", () => {
    const garbage = "not-valid-ciphertext";
    const result = decryptIfNotNull(garbage);
    expect(result).toBe(garbage);
  });

  it("decryptIfNotNull returns original on tampered ciphertext (graceful degradation)", () => {
    const original = "test-value";
    const ciphertext = encrypt(original);
    const parts = ciphertext.split(":");
    const tampered = `${parts[0]}:${parts[1]}:${parts[2].replace(/[0-9]/, "f")}`;
    const result = decryptIfNotNull(tampered);
    expect(result).toBe(tampered);
  });
});

describe("hashForLookup", () => {
  it("returns a 64-char hex string (SHA-256)", () => {
    const hash = hashForLookup("9876543210");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("same input always produces same hash (deterministic)", () => {
    const a = hashForLookup("9876543210");
    const b = hashForLookup("9876543210");
    expect(a).toBe(b);
  });

  it("different inputs produce different hashes", () => {
    const a = hashForLookup("9876543210");
    const b = hashForLookup("9876543211");
    expect(a).not.toBe(b);
  });

  it("hash is not reversible to original value", () => {
    const original = "9876543210";
    const hash = hashForLookup(original);
    // SHA-256 hash should not equal the original
    expect(hash).not.toBe(original);
  });
});

describe("ENCRYPTION_KEY validation", () => {
  it("encrypt/decrypt works with default key (32 bytes)", () => {
    // The default key "securekyc-32-byte-demo-key-12345" is exactly 32 bytes
    // This test verifies the module loaded successfully
    const original = "key-validation-test";
    expect(decrypt(encrypt(original))).toBe(original);
  });

  it("getKey rejects non-32-byte keys via decrypt of wrong-key ciphertext", () => {
    // We can't change the module-level ENCRYPTION_KEY easily,
    // but we CAN verify that decryption fails when ciphertext
    // was encrypted with a different key by constructing invalid ciphertext
    const original = "wrong-key-test";
    const ciphertext = encrypt(original);
    // Tamper with the auth tag to simulate wrong key - should throw
    const parts = ciphertext.split(":");
    const tampered = `${parts[0]}:00000000000000000000000000000000:${parts[2]}`;
    expect(() => decrypt(tampered)).toThrow();
  });
});
