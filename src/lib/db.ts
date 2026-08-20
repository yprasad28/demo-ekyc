import { mockDb } from "./mock-db";
import { encrypt, encryptIfNotNull, decryptIfNotNull, hashForLookup } from "./encryption";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any = null;
let useFallback = true;
let initPromise: Promise<void> | null = null;

function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      if (typeof window !== "undefined") return;

      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        console.warn("DATABASE_URL is not set. Using local JSON DB fallback.");
        return;
      }

      try {
        const [{ PrismaClient }, { PrismaPg }, { Pool }] = await Promise.all([
          import("@/generated/client"),
          import("@prisma/adapter-pg"),
          import("pg"),
        ]);

        const pool = new Pool({
          connectionString: databaseUrl,
          connectionTimeoutMillis: 10000,
        });
        const adapter = new PrismaPg(pool);
        prisma = new PrismaClient({ adapter });
        useFallback = false;
        console.log("Prisma PostgreSQL client initialized successfully.");
      } catch (e) {
        console.warn("Failed to initialize Prisma client, falling back to local JSON DB:", e);
        useFallback = true;
      }
    })();
  }
  return initPromise;
}

// Convert schema enums and return models
export const db = {
  // Customers
  findCustomerByMobile: async (mobile: string) => {
    await ensureInit();
    if (useFallback) return mockDb.findCustomerByMobile(mobile);
    try {
      const mobileHash = hashForLookup(mobile);
      const customer = await prisma.customer.findUnique({
        where: { mobileHash }
      });
      if (!customer) return null;
      return {
        ...customer,
        mobile: decryptIfNotNull(customer.mobile),
      };
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.findCustomerByMobile(mobile);
    }
  },
  
  findCustomerById: async (id: string) => {
    await ensureInit();
    if (useFallback) return mockDb.findCustomerById(id);
    try {
      const customer = await prisma.customer.findUnique({
        where: { id }
      });
      if (!customer) return null;
      return {
        ...customer,
        mobile: decryptIfNotNull(customer.mobile),
      };
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.findCustomerById(id);
    }
  },

  createCustomer: async (mobile: string) => {
    await ensureInit();
    if (useFallback) return mockDb.createCustomer(mobile);
    try {
      const mobileHash = hashForLookup(mobile);
      const mobileEncrypted = encrypt(mobile);
      return await prisma.customer.create({
        data: { mobile: mobileEncrypted, mobileHash }
      });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.createCustomer(mobile);
    }
  },

  updateCustomerEmail: async (id: string, email: string) => {
    await ensureInit();
    if (useFallback) return mockDb.updateCustomerEmail(id, email);
    try {
      return await prisma.customer.update({
        where: { id },
        data: { email }
      });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.updateCustomerEmail(id, email);
    }
  },

  // Applications
  findApplicationByCustomerId: async (customerId: string) => {
    await ensureInit();
    if (useFallback) return mockDb.findApplicationByCustomerId(customerId);
    try {
      const app = await prisma.kycApplication.findUnique({
        where: { customerId }
      });
      if (!app) return null;
      return {
        ...app,
        aadhaarNumber: decryptIfNotNull(app.aadhaarNumber),
        panNumber: decryptIfNotNull(app.panNumber),
      };
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.findApplicationByCustomerId(customerId);
    }
  },

  findApplicationById: async (id: string) => {
    await ensureInit();
    if (useFallback) return mockDb.findApplicationById(id);
    try {
      const app = await prisma.kycApplication.findUnique({
        where: { id }
      });
      if (!app) return null;
      return {
        ...app,
        aadhaarNumber: decryptIfNotNull(app.aadhaarNumber),
        panNumber: decryptIfNotNull(app.panNumber),
      };
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.findApplicationById(id);
    }
  },

  createApplication: async (customerId: string) => {
    await ensureInit();
    if (useFallback) return mockDb.createApplication(customerId);
    try {
      return await prisma.kycApplication.create({
        data: { customerId }
      });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.createApplication(customerId);
    }
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateApplication: async (id: string, updates: any) => {
    await ensureInit();
    if (useFallback) return mockDb.updateApplication(id, updates);
    try {
      const encryptedUpdates = { ...updates };
      if (updates.aadhaarNumber !== undefined) {
        encryptedUpdates.aadhaarNumber = encryptIfNotNull(updates.aadhaarNumber);
      }
      if (updates.panNumber !== undefined) {
        encryptedUpdates.panNumber = encryptIfNotNull(updates.panNumber);
      }
      const app = await prisma.kycApplication.update({
        where: { id },
        data: encryptedUpdates
      });
      return {
        ...app,
        aadhaarNumber: decryptIfNotNull(app.aadhaarNumber),
        panNumber: decryptIfNotNull(app.panNumber),
      };
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.updateApplication(id, updates);
    }
  },

  listApplications: async () => {
    await ensureInit();
    if (useFallback) return mockDb.listApplications();
    try {
      const apps = await prisma.kycApplication.findMany({
        include: {
          customer: true,
          documents: true
        },
        orderBy: { updatedAt: 'desc' }
      });
      return apps.map((app: Record<string, unknown>) => {
        const customer = app.customer as Record<string, unknown> | null;
        return {
          ...app,
          aadhaarNumber: decryptIfNotNull(app.aadhaarNumber as string | null),
          panNumber: decryptIfNotNull(app.panNumber as string | null),
          customer: customer ? {
            ...customer,
            mobile: decryptIfNotNull(customer.mobile as string | null),
          } : null,
        };
      });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.listApplications();
    }
  },

  // Documents
  createDocument: async (applicationId: string, type: 'AADHAAR' | 'PAN' | 'PHOTO' | 'SIGNATURE', fileUrl: string, fileName: string | null) => {
    await ensureInit();
    if (useFallback) return mockDb.createDocument(applicationId, type, fileUrl, fileName);
    try {
      const existing = await prisma.document.findFirst({
        where: { applicationId, type }
      });
      if (existing) {
        return await prisma.document.update({
          where: { id: existing.id },
          data: { fileUrl, fileName, uploadedAt: new Date() }
        });
      }
      return await prisma.document.create({
        data: { applicationId, type, fileUrl, fileName }
      });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.createDocument(applicationId, type, fileUrl, fileName);
    }
  },

  findDocumentsByApplicationId: async (applicationId: string) => {
    await ensureInit();
    if (useFallback) return mockDb.findDocumentsByApplicationId(applicationId);
    try {
      return await prisma.document.findMany({
        where: { applicationId }
      });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.findDocumentsByApplicationId(applicationId);
    }
  },

  // Consent Logs
  createConsentLog: async (customerId: string | null, type: string, consentGiven: boolean, ipAddress: string, userAgent: string | null) => {
    await ensureInit();
    if (useFallback) return mockDb.createConsentLog(customerId, type, consentGiven, ipAddress, userAgent);
    try {
      return await prisma.consentLog.create({
        data: { customerId, type, consentGiven, ipAddress, userAgent }
      });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.createConsentLog(customerId, type, consentGiven, ipAddress, userAgent);
    }
  },

  // Audit Logs
  createAuditLog: async (userId: string | null, action: string, details: string | null, ipAddress: string) => {
    await ensureInit();
    if (useFallback) return mockDb.createAuditLog(userId, action, details, ipAddress);
    try {
      return await prisma.auditLog.create({
        data: { userId, action, details, ipAddress }
      });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.createAuditLog(userId, action, details, ipAddress);
    }
  },

  listAuditLogs: async () => {
    await ensureInit();
    if (useFallback) return mockDb.listAuditLogs();
    try {
      return await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' }
      });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.listAuditLogs();
    }
  },

  // ─── Wallet Methods ───────────────────────────────────────────────────────
  findOrCreateWallet: async (customerId: string) => {
    await ensureInit();
    if (useFallback) return mockDb.findOrCreateWallet(customerId);
    try {
      const existing = await prisma.wallet.findUnique({ where: { customerId } });
      if (existing) return existing;
      return await prisma.wallet.create({ data: { customerId } });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.findOrCreateWallet(customerId);
    }
  },

  getWalletBalance: async (customerId: string) => {
    await ensureInit();
    if (useFallback) return mockDb.getWalletBalance(customerId);
    try {
      return await prisma.wallet.findUnique({ where: { customerId } });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.getWalletBalance(customerId);
    }
  },

  // Atomic deduction: UPDATE wallet SET balance = balance - X WHERE balance >= X
  deductWalletBalance: async (walletId: string, amount: number) => {
    await ensureInit();
    if (useFallback) return mockDb.deductWalletBalance(walletId, amount);
    try {
      // Atomic conditional update — prevents overspend
      const [updated] = await prisma.$queryRaw`
        UPDATE wallets
        SET balance = balance - ${amount}, "updatedAt" = NOW()
        WHERE id = ${walletId} AND balance >= ${amount}
        RETURNING *
      `;
      return updated || null;
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.deductWalletBalance(walletId, amount);
    }
  },

  creditWalletBalance: async (walletId: string, amount: number) => {
    await ensureInit();
    if (useFallback) return mockDb.creditWalletBalance(walletId, amount);
    try {
      return await prisma.wallet.update({
        where: { id: walletId },
        data: { balance: { increment: amount } },
      });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.creditWalletBalance(walletId, amount);
    }
  },

  useFreeCredit: async (customerId: string, type: 'PAN' | 'CREDIT_SCORE' | 'AADHAAR') => {
    await ensureInit();
    if (useFallback) return mockDb.useFreeCredit(customerId, type);
    try {
      const field = type === 'PAN' ? 'freePan' : type === 'CREDIT_SCORE' ? 'freeCreditScore' : 'freeAadhaar';
      const [updated] = await prisma.$queryRaw`
        UPDATE wallets
        SET ${field} = ${field} - 1, "updatedAt" = NOW()
        WHERE "customerId" = ${customerId} AND ${field} > 0
        RETURNING *
      `;
      return !!updated;
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.useFreeCredit(customerId, type);
    }
  },

  restoreFreeCredit: async (customerId: string, type: 'PAN' | 'CREDIT_SCORE' | 'AADHAAR') => {
    await ensureInit();
    if (useFallback) return mockDb.restoreFreeCredit(customerId, type);
    try {
      const field = type === 'PAN' ? 'freePan' : type === 'CREDIT_SCORE' ? 'freeCreditScore' : 'freeAadhaar';
      await prisma.$queryRaw`
        UPDATE wallets
        SET ${field} = ${field} + 1, "updatedAt" = NOW()
        WHERE "customerId" = ${customerId}
      `;
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.restoreFreeCredit(customerId, type);
    }
  },

  createWalletTransaction: async (
    walletId: string,
    type: string,
    amount: number,
    balanceAfter: number,
    referenceId: string | null,
    description: string | null,
    metadata: string | null
  ) => {
    await ensureInit();
    if (useFallback) return mockDb.createWalletTransaction(walletId, type, amount, balanceAfter, referenceId, description, metadata);
    try {
      return await prisma.walletTransaction.create({
        data: { walletId, type, amount, balanceAfter, referenceId, description, metadata },
      });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.createWalletTransaction(walletId, type, amount, balanceAfter, referenceId, description, metadata);
    }
  },

  getWalletTransactions: async (walletId: string, limit = 20, offset = 0) => {
    await ensureInit();
    if (useFallback) return mockDb.getWalletTransactions(walletId, limit, offset);
    try {
      return await prisma.walletTransaction.findMany({
        where: { walletId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.getWalletTransactions(walletId, limit, offset);
    }
  },

  // ─── Payment Order Methods ────────────────────────────────────────────────
  createPaymentOrder: async (customerId: string, razorpayOrderId: string, amount: number, idempotencyKey: string) => {
    await ensureInit();
    if (useFallback) return mockDb.createPaymentOrder(customerId, razorpayOrderId, amount, idempotencyKey);
    try {
      return await prisma.paymentOrder.create({
        data: { customerId, razorpayOrderId, amount, idempotencyKey },
      });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.createPaymentOrder(customerId, razorpayOrderId, amount, idempotencyKey);
    }
  },

  findPaymentOrderById: async (razorpayOrderId: string) => {
    await ensureInit();
    if (useFallback) return mockDb.findPaymentOrderById(razorpayOrderId);
    try {
      return await prisma.paymentOrder.findUnique({ where: { razorpayOrderId } });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.findPaymentOrderById(razorpayOrderId);
    }
  },

  findPaymentOrderByIdempotencyKey: async (key: string) => {
    await ensureInit();
    if (useFallback) return mockDb.findPaymentOrderByIdempotencyKey(key);
    try {
      return await prisma.paymentOrder.findUnique({ where: { idempotencyKey: key } });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.findPaymentOrderByIdempotencyKey(key);
    }
  },

  findPaymentOrderByPaymentId: async (paymentId: string) => {
    await ensureInit();
    if (useFallback) return mockDb.findPaymentOrderByPaymentId(paymentId);
    try {
      return await prisma.paymentOrder.findUnique({ where: { razorpayPaymentId: paymentId } });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.findPaymentOrderByPaymentId(paymentId);
    }
  },

  updatePaymentOrder: async (orderId: string, updates: Record<string, unknown>) => {
    await ensureInit();
    if (useFallback) return mockDb.updatePaymentOrder(orderId, updates);
    try {
      return await prisma.paymentOrder.update({ where: { id: orderId }, data: updates });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.updatePaymentOrder(orderId, updates);
    }
  },

  markWalletCredited: async (orderId: string) => {
    await ensureInit();
    if (useFallback) return mockDb.markWalletCredited(orderId);
    try {
      return await prisma.paymentOrder.update({
        where: { id: orderId },
        data: { walletCredited: true, status: 'CREDITED' },
      });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.markWalletCredited(orderId);
    }
  },

  // ─── Webhook Event Methods ────────────────────────────────────────────────
  findWebhookEventByEventId: async (eventId: string) => {
    await ensureInit();
    if (useFallback) return mockDb.findWebhookEventByEventId(eventId);
    try {
      return await prisma.webhookEvent.findUnique({ where: { eventId } });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.findWebhookEventByEventId(eventId);
    }
  },

  createWebhookEvent: async (eventId: string, eventType: string, payload: string) => {
    await ensureInit();
    if (useFallback) return mockDb.createWebhookEvent(eventId, eventType, payload);
    try {
      return await prisma.webhookEvent.create({
        data: { eventId, eventType, payload },
      });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.createWebhookEvent(eventId, eventType, payload);
    }
  },

  markWebhookEventProcessed: async (eventId: string, error?: string) => {
    await ensureInit();
    if (useFallback) return mockDb.markWebhookEventProcessed(eventId, error);
    try {
      await prisma.webhookEvent.update({
        where: { eventId },
        data: { processed: !error, error: error || null },
      });
    } catch (e) {
      console.error("Prisma error, falling back to mockDb:", e);
      return mockDb.markWebhookEventProcessed(eventId, error);
    }
  },
};
