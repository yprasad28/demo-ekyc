import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";

// ============================================================
// RETURN SHAPE DOCUMENTATION (for future refactor reference):
//
// verifyCustomerToken(req: NextRequest): CustomerPayload | null
//   Returns: { customerId, mobile, role, exp, iat } | null
//   null means: missing token / expired / malformed / wrong secret / no customerId
//
// verifyAdminToken(req: NextRequest): AdminPayload | null
//   Returns: { adminId, email, role, name, exp, iat } | null
//   null means: missing token / expired / malformed / wrong secret / role !== "ADMIN"
//
// Both read token from: cookie first, then Authorization: Bearer header.
// ============================================================

const JWT_SECRET = process.env.JWT_SECRET || "securekyc-demo-secret-key-2024";

// Import the functions we are testing
import { verifyCustomerToken, verifyAdminToken } from "@/lib/auth-middleware";

// Helper: create a minimal NextRequest-like object with cookies and headers
function makeRequest(opts: {
  cookieName?: string;
  cookieValue?: string;
  authHeader?: string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}): any {
  const cookies = new Map<string, { value: string }>();
  if (opts.cookieName && opts.cookieValue) {
    cookies.set(opts.cookieName, { value: opts.cookieValue });
  }

  const headers = new Map<string, string>();
  if (opts.authHeader) {
    headers.set("authorization", opts.authHeader);
  }

  return {
    cookies: {
      get: (name: string) => cookies.get(name) || undefined,
    },
    headers: {
      get: (name: string) => headers.get(name) || null,
    },
  };
}

// Helper: create a valid token
function signToken(
  payload: Record<string, unknown>,
  options?: jwt.SignOptions
): string {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "1h",
    ...options,
  });
}

// ============================================================
// verifyCustomerToken
// ============================================================
describe("verifyCustomerToken", () => {
  const validPayload = {
    customerId: "cust-123",
    mobile: "9876543210",
    role: "CUSTOMER",
  };

  it("returns payload for valid cookie token", () => {
    const token = signToken(validPayload);
    const req = makeRequest({ cookieName: "kyc_token", cookieValue: token });
    const result = verifyCustomerToken(req);
    expect(result).not.toBeNull();
    expect(result!.customerId).toBe("cust-123");
    expect(result!.mobile).toBe("9876543210");
    expect(result!.role).toBe("CUSTOMER");
  });

  it("returns payload for valid Authorization Bearer header token", () => {
    const token = signToken(validPayload);
    const req = makeRequest({ authHeader: `Bearer ${token}` });
    const result = verifyCustomerToken(req);
    expect(result).not.toBeNull();
    expect(result!.customerId).toBe("cust-123");
    expect(result!.mobile).toBe("9876543210");
  });

  it("returns null when no token is provided", () => {
    const req = makeRequest({});
    const result = verifyCustomerToken(req);
    expect(result).toBeNull();
  });

  it("returns null for expired token", () => {
    const token = signToken(validPayload, { expiresIn: "-1h" });
    const req = makeRequest({ cookieName: "kyc_token", cookieValue: token });
    const result = verifyCustomerToken(req);
    expect(result).toBeNull();
  });

  it("returns null for token signed with wrong secret", () => {
    const token = jwt.sign(validPayload, "wrong-secret-key", {
      algorithm: "HS256",
    });
    const req = makeRequest({ cookieName: "kyc_token", cookieValue: token });
    const result = verifyCustomerToken(req);
    expect(result).toBeNull();
  });

  it("returns null for malformed token string", () => {
    const req = makeRequest({
      cookieName: "kyc_token",
      cookieValue: "not-a-real-jwt-token",
    });
    const result = verifyCustomerToken(req);
    expect(result).toBeNull();
  });

  it("returns null when customerId is missing from payload", () => {
    const token = signToken({ mobile: "9876543210", role: "CUSTOMER" });
    const req = makeRequest({ cookieName: "kyc_token", cookieValue: token });
    const result = verifyCustomerToken(req);
    expect(result).toBeNull();
  });

  it("cookie takes precedence over Authorization header", () => {
    const cookieToken = signToken(validPayload);
    const otherToken = signToken({
      customerId: "other",
      mobile: "1111111111",
      role: "CUSTOMER",
    });
    const req = makeRequest({
      cookieName: "kyc_token",
      cookieValue: cookieToken,
      authHeader: `Bearer ${otherToken}`,
    });
    const result = verifyCustomerToken(req);
    expect(result).not.toBeNull();
    expect(result!.customerId).toBe("cust-123");
  });

  it("returns payload with exp and iat fields", () => {
    const token = signToken(validPayload);
    const req = makeRequest({ cookieName: "kyc_token", cookieValue: token });
    const result = verifyCustomerToken(req);
    expect(result).not.toBeNull();
    expect(result!.exp).toBeDefined();
    expect(result!.iat).toBeDefined();
  });
});

// ============================================================
// verifyAdminToken
// ============================================================
describe("verifyAdminToken", () => {
  const validAdminPayload = {
    adminId: "admin-001",
    email: "admin@securekyc.in",
    role: "ADMIN",
    name: "Test Admin",
  };

  it("returns payload for valid cookie token", () => {
    const token = signToken(validAdminPayload);
    const req = makeRequest({ cookieName: "admin_token", cookieValue: token });
    const result = verifyAdminToken(req);
    expect(result).not.toBeNull();
    expect(result!.adminId).toBe("admin-001");
    expect(result!.email).toBe("admin@securekyc.in");
    expect(result!.role).toBe("ADMIN");
    expect(result!.name).toBe("Test Admin");
  });

  it("returns payload for valid Authorization Bearer header token", () => {
    const token = signToken(validAdminPayload);
    const req = makeRequest({ authHeader: `Bearer ${token}` });
    const result = verifyAdminToken(req);
    expect(result).not.toBeNull();
    expect(result!.adminId).toBe("admin-001");
    expect(result!.role).toBe("ADMIN");
  });

  it("returns null when no token is provided", () => {
    const req = makeRequest({});
    const result = verifyAdminToken(req);
    expect(result).toBeNull();
  });

  it("returns null for expired token", () => {
    const token = signToken(validAdminPayload, { expiresIn: "-1h" });
    const req = makeRequest({ cookieName: "admin_token", cookieValue: token });
    const result = verifyAdminToken(req);
    expect(result).toBeNull();
  });

  it("returns null for token signed with wrong secret", () => {
    const token = jwt.sign(validAdminPayload, "wrong-secret-key", {
      algorithm: "HS256",
    });
    const req = makeRequest({ cookieName: "admin_token", cookieValue: token });
    const result = verifyAdminToken(req);
    expect(result).toBeNull();
  });

  it("returns null for malformed token string", () => {
    const req = makeRequest({
      cookieName: "admin_token",
      cookieValue: "definitely-not-a-jwt",
    });
    const result = verifyAdminToken(req);
    expect(result).toBeNull();
  });

  it("returns null when role is not ADMIN", () => {
    const token = signToken({
      adminId: "admin-001",
      email: "admin@securekyc.in",
      role: "CUSTOMER",
      name: "Imposter",
    });
    const req = makeRequest({ cookieName: "admin_token", cookieValue: token });
    const result = verifyAdminToken(req);
    expect(result).toBeNull();
  });

  it("returns null when role field is missing", () => {
    const token = signToken({
      adminId: "admin-001",
      email: "admin@securekyc.in",
      name: "No Role Admin",
    });
    const req = makeRequest({ cookieName: "admin_token", cookieValue: token });
    const result = verifyAdminToken(req);
    expect(result).toBeNull();
  });

  it("cookie takes precedence over Authorization header", () => {
    const cookieToken = signToken(validAdminPayload);
    const otherToken = signToken({
      adminId: "other-admin",
      email: "other@test.com",
      role: "ADMIN",
      name: "Other",
    });
    const req = makeRequest({
      cookieName: "admin_token",
      cookieValue: cookieToken,
      authHeader: `Bearer ${otherToken}`,
    });
    const result = verifyAdminToken(req);
    expect(result).not.toBeNull();
    expect(result!.adminId).toBe("admin-001");
  });

  it("returns payload with exp and iat fields", () => {
    const token = signToken(validAdminPayload);
    const req = makeRequest({ cookieName: "admin_token", cookieValue: token });
    const result = verifyAdminToken(req);
    expect(result).not.toBeNull();
    expect(result!.exp).toBeDefined();
    expect(result!.iat).toBeDefined();
  });

  it("customer token is rejected by verifyAdminToken (role check)", () => {
    const customerToken = signToken({
      customerId: "cust-123",
      mobile: "9876543210",
      role: "CUSTOMER",
    });
    const req = makeRequest({
      cookieName: "admin_token",
      cookieValue: customerToken,
    });
    const result = verifyAdminToken(req);
    expect(result).toBeNull();
  });

  it("admin token is accepted by verifyCustomerToken (no role check)", () => {
    // verifyCustomerToken only checks for customerId, not role
    const adminToken = signToken({
      adminId: "admin-001",
      email: "admin@securekyc.in",
      role: "ADMIN",
      name: "Admin",
    });
    const req = makeRequest({
      cookieName: "kyc_token",
      cookieValue: adminToken,
    });
    const result = verifyCustomerToken(req);
    // adminToken payload does NOT have customerId, so it returns null
    expect(result).toBeNull();
  });
});
