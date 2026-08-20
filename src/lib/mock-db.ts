import fs from 'fs';
import path from 'path';
import { encrypt, encryptIfNotNull, decryptIfNotNull, hashForLookup } from './encryption';

// Define DB path inside workspace
const DB_FILE = path.join(process.cwd(), 'mock-db.json');
let memoryDb: MockSchema | null = null;
let fileAvailable: boolean | null = null;

export interface CustomerMock {
  id: string;
  mobile: string;
  mobileHash: string;
  email: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface KycApplicationMock {
  id: string;
  customerId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  currentStep: number;
  aadhaarNumber: string | null;
  aadhaarName: string | null;
  aadhaarDob: string | null;
  aadhaarGender: string | null;
  aadhaarAddress: string | null;
  aadhaarPhoto: string | null;
  panNumber: string | null;
  panName: string | null;
  panDob: string | null;
  panType: string | null;
  panMatchScore: number | null;
  panStatus: string | null;
  panError: string | null;
  // Credit Score data
  creditScore: number | null;
  creditScoreBureau: string | null;
  creditScoreCategory: string | null;
  creditScoreDate: string | null;
  // DigiLocker session
  decentroTxnId: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentMock {
  id: string;
  applicationId: string;
  type: 'AADHAAR' | 'PAN' | 'PHOTO' | 'SIGNATURE';
  fileUrl: string;
  fileName: string | null;
  uploadedAt: string;
}

export interface ConsentLogMock {
  id: string;
  customerId: string | null;
  type: string;
  consentGiven: boolean;
  ipAddress: string;
  userAgent: string | null;
  timestamp: string;
}

export interface AuditLogMock {
  id: string;
  userId: string | null;
  action: string;
  details: string | null;
  ipAddress: string;
  timestamp: string;
}

export interface WalletMock {
  id: string;
  customerId: string;
  balance: number;         // In paise
  freePan: number;
  freeCreditScore: number;
  freeAadhaar: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransactionMock {
  id: string;
  walletId: string;
  type: string;
  amount: number;          // Positive = credit, negative = debit
  balanceAfter: number;
  referenceId: string | null;
  description: string | null;
  metadata: string | null;
  createdAt: string;
}

export interface PaymentOrderMock {
  id: string;
  customerId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amount: number;
  currency: string;
  status: string;
  idempotencyKey: string;
  receipt: string | null;
  walletCredited: boolean;
  failureReason: string | null;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEventMock {
  id: string;
  eventId: string;
  eventType: string;
  payload: string;
  processed: boolean;
  error: string | null;
  createdAt: string;
}

interface MockSchema {
  customers: CustomerMock[];
  kyc_applications: KycApplicationMock[];
  documents: DocumentMock[];
  consent_logs: ConsentLogMock[];
  audit_logs: AuditLogMock[];
  wallets: WalletMock[];
  wallet_transactions: WalletTransactionMock[];
  payment_orders: PaymentOrderMock[];
  webhook_events: WebhookEventMock[];
}

function createEmptyDb(): MockSchema {
  return {
    customers: [],
    kyc_applications: [],
    documents: [],
    consent_logs: [],
    audit_logs: [],
    wallets: [],
    wallet_transactions: [],
    payment_orders: [],
    webhook_events: [],
  };
}

function initDb(): MockSchema {
  if (fileAvailable === false) {
    if (!memoryDb) memoryDb = createEmptyDb();
    return memoryDb;
  }

  if (!fs.existsSync(DB_FILE)) {
    const defaultDb = createEmptyDb();
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf-8');
      fileAvailable = true;
      return defaultDb;
    } catch {
      fileAvailable = false;
      memoryDb = defaultDb;
      return memoryDb;
    }
  }
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    fileAvailable = true;
    return JSON.parse(content);
  } catch {
    const defaultDb = createEmptyDb();
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf-8');
      fileAvailable = true;
      return defaultDb;
    } catch {
      fileAvailable = false;
      memoryDb = defaultDb;
      return memoryDb;
    }
  }
}

function saveDb(data: MockSchema) {
  if (fileAvailable === false) {
    memoryDb = data;
    return;
  }
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    fileAvailable = false;
    memoryDb = data;
  }
}

function decryptApplicationFields(app: KycApplicationMock): KycApplicationMock {
  return {
    ...app,
    aadhaarNumber: decryptIfNotNull(app.aadhaarNumber),
    panNumber: decryptIfNotNull(app.panNumber),
  };
}

export const mockDb = {
  // Customers
  findCustomerByMobile: (mobile: string): CustomerMock | null => {
    const db = initDb();
    const hash = hashForLookup(mobile);
    const customer = db.customers.find(c => c.mobileHash === hash) || null;
    if (!customer) return null;
    return {
      ...customer,
      mobile: decryptIfNotNull(customer.mobile) ?? customer.mobile,
    };
  },
  findCustomerById: (id: string): CustomerMock | null => {
    const db = initDb();
    const customer = db.customers.find(c => c.id === id) || null;
    if (!customer) return null;
    return {
      ...customer,
      mobile: decryptIfNotNull(customer.mobile) ?? customer.mobile,
    };
  },
  createCustomer: (mobile: string): CustomerMock => {
    const db = initDb();
    const hash = hashForLookup(mobile);
    const existing = db.customers.find(c => c.mobileHash === hash);
    if (existing) return existing;

    const newCustomer: CustomerMock = {
      id: crypto.randomUUID(),
      mobile: encrypt(mobile),
      mobileHash: hash,
      email: null,
      role: 'CUSTOMER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.customers.push(newCustomer);
    saveDb(db);
    return newCustomer;
  },
  updateCustomerEmail: (id: string, email: string): CustomerMock | null => {
    const db = initDb();
    const idx = db.customers.findIndex(c => c.id === id);
    if (idx === -1) return null;
    db.customers[idx].email = email;
    db.customers[idx].updatedAt = new Date().toISOString();
    saveDb(db);
    return db.customers[idx];
  },

  // Applications
  findApplicationByCustomerId: (customerId: string): KycApplicationMock | null => {
    const db = initDb();
    const app = db.kyc_applications.find(a => a.customerId === customerId) || null;
    return app ? decryptApplicationFields(app) : null;
  },
  findApplicationById: (id: string): KycApplicationMock | null => {
    const db = initDb();
    const app = db.kyc_applications.find(a => a.id === id) || null;
    return app ? decryptApplicationFields(app) : null;
  },
  createApplication: (customerId: string): KycApplicationMock => {
    const db = initDb();
    const existing = db.kyc_applications.find(a => a.customerId === customerId);
    if (existing) return decryptApplicationFields(existing);

    const newApp: KycApplicationMock = {
      id: crypto.randomUUID(),
      customerId,
      status: 'PENDING',
      currentStep: 1,
      aadhaarNumber: null,
      aadhaarName: null,
      aadhaarDob: null,
      aadhaarGender: null,
      aadhaarAddress: null,
      aadhaarPhoto: null,
      panNumber: null,
      panName: null,
      panDob: null,
      panType: null,
      panMatchScore: null,
      panStatus: null,
      panError: null,
      creditScore: null,
      creditScoreBureau: null,
      creditScoreCategory: null,
      creditScoreDate: null,
      decentroTxnId: null,
      rejectionReason: null,
      submittedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.kyc_applications.push(newApp);
    saveDb(db);
    return decryptApplicationFields(newApp);
  },
  updateApplication: (id: string, updates: Partial<KycApplicationMock>): KycApplicationMock | null => {
    const db = initDb();
    const idx = db.kyc_applications.findIndex(a => a.id === id);
    if (idx === -1) return null;

    const encryptedUpdates: Record<string, unknown> = { ...updates };
    if (updates.aadhaarNumber !== undefined) {
      encryptedUpdates.aadhaarNumber = encryptIfNotNull(updates.aadhaarNumber);
    }
    if (updates.panNumber !== undefined) {
      encryptedUpdates.panNumber = encryptIfNotNull(updates.panNumber);
    }

    db.kyc_applications[idx] = {
      ...db.kyc_applications[idx],
      ...encryptedUpdates,
      updatedAt: new Date().toISOString()
    } as KycApplicationMock;

    saveDb(db);
    return decryptApplicationFields(db.kyc_applications[idx]);
  },
  listApplications: (): (KycApplicationMock & { customer: CustomerMock; documents: DocumentMock[] })[] => {
    const db = initDb();
    return db.kyc_applications.map(app => {
      const rawCustomer = db.customers.find(c => c.id === app.customerId);
      const customer: CustomerMock = rawCustomer
        ? { ...rawCustomer, mobile: decryptIfNotNull(rawCustomer.mobile) ?? rawCustomer.mobile }
        : {
          id: app.customerId,
          mobile: '',
          mobileHash: '',
          email: null,
          role: 'CUSTOMER',
          createdAt: app.createdAt,
          updatedAt: app.updatedAt
        };
      const docs = db.documents.filter(d => d.applicationId === app.id);
      return {
        ...decryptApplicationFields(app),
        customer,
        documents: docs
      };
    });
  },

  // Documents
  createDocument: (applicationId: string, type: DocumentMock['type'], fileUrl: string, fileName: string | null): DocumentMock => {
    const db = initDb();
    db.documents = db.documents.filter(d => !(d.applicationId === applicationId && d.type === type));

    const newDoc: DocumentMock = {
      id: crypto.randomUUID(),
      applicationId,
      type,
      fileUrl,
      fileName,
      uploadedAt: new Date().toISOString()
    };
    db.documents.push(newDoc);
    saveDb(db);
    return newDoc;
  },
  findDocumentsByApplicationId: (applicationId: string): DocumentMock[] => {
    const db = initDb();
    return db.documents.filter(d => d.applicationId === applicationId);
  },

  // Consent Logs
  createConsentLog: (customerId: string | null, type: string, consentGiven: boolean, ipAddress: string, userAgent: string | null): ConsentLogMock => {
    const db = initDb();
    const newLog: ConsentLogMock = {
      id: crypto.randomUUID(),
      customerId,
      type,
      consentGiven,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    };
    db.consent_logs.push(newLog);
    saveDb(db);
    return newLog;
  },

  // Audit Logs
  createAuditLog: (userId: string | null, action: string, details: string | null, ipAddress: string): AuditLogMock => {
    const db = initDb();
    const newLog: AuditLogMock = {
      id: crypto.randomUUID(),
      userId,
      action,
      details,
      ipAddress,
      timestamp: new Date().toISOString()
    };
    db.audit_logs.push(newLog);
    saveDb(db);
    return newLog;
  },
  listAuditLogs: (): AuditLogMock[] => {
    const db = initDb();
    return db.audit_logs;
  },

  // ─── Wallet Methods ───────────────────────────────────────────────────────
  findOrCreateWallet: (customerId: string): WalletMock => {
    const db = initDb();
    let wallet = db.wallets.find(w => w.customerId === customerId);
    if (wallet) return wallet;

    wallet = {
      id: crypto.randomUUID(),
      customerId,
      balance: 0,
      freePan: 5,
      freeCreditScore: 5,
      freeAadhaar: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.wallets.push(wallet);
    saveDb(db);
    return wallet;
  },

  getWalletBalance: (customerId: string): WalletMock | null => {
    const db = initDb();
    return db.wallets.find(w => w.customerId === customerId) || null;
  },

  // Atomic wallet deduction — returns null if insufficient balance
  deductWalletBalance: (walletId: string, amount: number): WalletMock | null => {
    const db = initDb();
    const idx = db.wallets.findIndex(w => w.id === walletId);
    if (idx === -1) return null;

    const wallet = db.wallets[idx];
    if (wallet.balance < amount) return null; // Insufficient balance

    // Atomic: deduct and save
    wallet.balance -= amount;
    wallet.updatedAt = new Date().toISOString();
    saveDb(db);
    return wallet;
  },

  // Atomic wallet credit
  creditWalletBalance: (walletId: string, amount: number): WalletMock | null => {
    const db = initDb();
    const idx = db.wallets.findIndex(w => w.id === walletId);
    if (idx === -1) return null;

    const wallet = db.wallets[idx];
    wallet.balance += amount;
    wallet.updatedAt = new Date().toISOString();
    saveDb(db);
    return wallet;
  },

  // Use free credit — returns true if credit was available
  useFreeCredit: (customerId: string, type: 'PAN' | 'CREDIT_SCORE' | 'AADHAAR'): boolean => {
    const db = initDb();
    const wallet = db.wallets.find(w => w.customerId === customerId);
    if (!wallet) return false;

    const field = type === 'PAN' ? 'freePan' : type === 'CREDIT_SCORE' ? 'freeCreditScore' : 'freeAadhaar';
    if (wallet[field] <= 0) return false;

    wallet[field] -= 1;
    wallet.updatedAt = new Date().toISOString();
    saveDb(db);
    return true;
  },

  // Restore free credit (on KYC failure)
  restoreFreeCredit: (customerId: string, type: 'PAN' | 'CREDIT_SCORE' | 'AADHAAR'): void => {
    const db = initDb();
    const wallet = db.wallets.find(w => w.customerId === customerId);
    if (!wallet) return;

    const field = type === 'PAN' ? 'freePan' : type === 'CREDIT_SCORE' ? 'freeCreditScore' : 'freeAadhaar';
    wallet[field] += 1;
    wallet.updatedAt = new Date().toISOString();
    saveDb(db);
  },

  // Create wallet transaction
  createWalletTransaction: (
    walletId: string,
    type: string,
    amount: number,
    balanceAfter: number,
    referenceId: string | null,
    description: string | null,
    metadata: string | null
  ): WalletTransactionMock => {
    const db = initDb();
    const tx: WalletTransactionMock = {
      id: crypto.randomUUID(),
      walletId,
      type,
      amount,
      balanceAfter,
      referenceId,
      description,
      metadata,
      createdAt: new Date().toISOString(),
    };
    db.wallet_transactions.push(tx);
    saveDb(db);
    return tx;
  },

  // Get wallet transactions
  getWalletTransactions: (walletId: string, limit = 20, offset = 0): WalletTransactionMock[] => {
    const db = initDb();
    return db.wallet_transactions
      .filter(tx => tx.walletId === walletId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);
  },

  // ─── Payment Order Methods ────────────────────────────────────────────────
  createPaymentOrder: (
    customerId: string,
    razorpayOrderId: string,
    amount: number,
    idempotencyKey: string
  ): PaymentOrderMock => {
    const db = initDb();
    const order: PaymentOrderMock = {
      id: crypto.randomUUID(),
      customerId,
      razorpayOrderId,
      razorpayPaymentId: null,
      amount,
      currency: 'INR',
      status: 'CREATED',
      idempotencyKey,
      receipt: null,
      walletCredited: false,
      failureReason: null,
      metadata: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.payment_orders.push(order);
    saveDb(db);
    return order;
  },

  // Find order by Razorpay order ID
  findPaymentOrderById: (razorpayOrderId: string): PaymentOrderMock | null => {
    const db = initDb();
    return db.payment_orders.find(o => o.razorpayOrderId === razorpayOrderId) || null;
  },

  // Find order by idempotency key (duplicate protection)
  findPaymentOrderByIdempotencyKey: (key: string): PaymentOrderMock | null => {
    const db = initDb();
    return db.payment_orders.find(o => o.idempotencyKey === key) || null;
  },

  // Find order by Razorpay payment ID
  findPaymentOrderByPaymentId: (paymentId: string): PaymentOrderMock | null => {
    const db = initDb();
    return db.payment_orders.find(o => o.razorpayPaymentId === paymentId) || null;
  },

  // Update payment order status
  updatePaymentOrder: (orderId: string, updates: Partial<PaymentOrderMock>): PaymentOrderMock | null => {
    const db = initDb();
    const idx = db.payment_orders.findIndex(o => o.id === orderId);
    if (idx === -1) return null;

    db.payment_orders[idx] = {
      ...db.payment_orders[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveDb(db);
    return db.payment_orders[idx];
  },

  // Mark order as wallet credited (prevent double-credit)
  markWalletCredited: (orderId: string): PaymentOrderMock | null => {
    const db = initDb();
    const idx = db.payment_orders.findIndex(o => o.id === orderId);
    if (idx === -1) return null;

    db.payment_orders[idx].walletCredited = true;
    db.payment_orders[idx].status = 'CREDITED';
    db.payment_orders[idx].updatedAt = new Date().toISOString();
    saveDb(db);
    return db.payment_orders[idx];
  },

  // ─── Webhook Event Methods ────────────────────────────────────────────────
  findWebhookEventByEventId: (eventId: string): WebhookEventMock | null => {
    const db = initDb();
    return db.webhook_events.find(e => e.eventId === eventId) || null;
  },

  createWebhookEvent: (eventId: string, eventType: string, payload: string): WebhookEventMock => {
    const db = initDb();
    const event: WebhookEventMock = {
      id: crypto.randomUUID(),
      eventId,
      eventType,
      payload,
      processed: false,
      error: null,
      createdAt: new Date().toISOString(),
    };
    db.webhook_events.push(event);
    saveDb(db);
    return event;
  },

  markWebhookEventProcessed: (eventId: string, error?: string): void => {
    const db = initDb();
    const event = db.webhook_events.find(e => e.eventId === eventId);
    if (event) {
      event.processed = !error;
      event.error = error || null;
      saveDb(db);
    }
  },
};
