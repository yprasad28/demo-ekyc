import fs from 'fs';
import path from 'path';
import { encrypt, decrypt, encryptIfNotNull, decryptIfNotNull, hashForLookup } from './encryption';

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

interface MockSchema {
  customers: CustomerMock[];
  kyc_applications: KycApplicationMock[];
  documents: DocumentMock[];
  consent_logs: ConsentLogMock[];
  audit_logs: AuditLogMock[];
}

function createEmptyDb(): MockSchema {
  return {
    customers: [],
    kyc_applications: [],
    documents: [],
    consent_logs: [],
    audit_logs: []
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
      mobile: decryptIfNotNull(customer.mobile),
    };
  },
  findCustomerById: (id: string): CustomerMock | null => {
    const db = initDb();
    const customer = db.customers.find(c => c.id === id) || null;
    if (!customer) return null;
    return {
      ...customer,
      mobile: decryptIfNotNull(customer.mobile),
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
        ? { ...rawCustomer, mobile: decryptIfNotNull(rawCustomer.mobile) }
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
  }
};
