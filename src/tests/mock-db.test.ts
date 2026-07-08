import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import { mockDb } from '@/lib/mock-db'
import { decrypt, hashForLookup } from '@/lib/encryption'

describe('mock-db', () => {
  beforeEach(() => {
    if (fs.existsSync('mock-db.json')) fs.unlinkSync('mock-db.json')
  })

  describe('customers', () => {
    it('createCustomer — creates new customer with encrypted mobile', () => {
      const customer = mockDb.createCustomer('9000000001')
      expect(customer.mobileHash).toBe(hashForLookup('9000000001'))
      expect(decrypt(customer.mobile)).toBe('9000000001')
      expect(customer.role).toBe('CUSTOMER')
      expect(customer.id).toBeTruthy()
    })

    it('createCustomer — returns existing if mobile already registered', () => {
      const c1 = mockDb.createCustomer('9000000002')
      const c2 = mockDb.createCustomer('9000000002')
      expect(c1.id).toBe(c2.id)
    })

    it('findCustomerByMobile — returns customer', () => {
      mockDb.createCustomer('9000000003')
      const found = mockDb.findCustomerByMobile('9000000003')
      expect(found).not.toBeNull()
      expect(found?.mobileHash).toBe(hashForLookup('9000000003'))
    })

    it('findCustomerByMobile — returns null for unknown mobile', () => {
      expect(mockDb.findCustomerByMobile('0000000000')).toBeNull()
    })

    it('findCustomerById — returns customer by ID', () => {
      const created = mockDb.createCustomer('9000000004')
      const found = mockDb.findCustomerById(created.id)
      expect(found?.id).toBe(created.id)
    })

    it('updateCustomerEmail — updates email field', () => {
      const customer = mockDb.createCustomer('9000000005')
      const updated = mockDb.updateCustomerEmail(customer.id, 'test@test.com')
      expect(updated?.email).toBe('test@test.com')
    })

    it('updateCustomerEmail — returns null for unknown id', () => {
      expect(mockDb.updateCustomerEmail('fake-id', 'x@x.com')).toBeNull()
    })
  })

  describe('kyc_applications', () => {
    it('createApplication — creates application for customer', () => {
      const customer = mockDb.createCustomer('9001000001')
      const app = mockDb.createApplication(customer.id)
      expect(app.customerId).toBe(customer.id)
      expect(app.status).toBe('PENDING')
      expect(app.currentStep).toBe(1)
    })

    it('createApplication — returns existing if already created', () => {
      const customer = mockDb.createCustomer('9001000002')
      const a1 = mockDb.createApplication(customer.id)
      const a2 = mockDb.createApplication(customer.id)
      expect(a1.id).toBe(a2.id)
    })

    it('findApplicationByCustomerId — returns application', () => {
      const customer = mockDb.createCustomer('9001000003')
      mockDb.createApplication(customer.id)
      const found = mockDb.findApplicationByCustomerId(customer.id)
      expect(found).not.toBeNull()
    })

    it('findApplicationByCustomerId — returns null if no application', () => {
      expect(mockDb.findApplicationByCustomerId('fake-id')).toBeNull()
    })

    it('updateApplication — updates status to APPROVED', () => {
      const customer = mockDb.createCustomer('9001000004')
      const app = mockDb.createApplication(customer.id)
      const updated = mockDb.updateApplication(app.id, { status: 'APPROVED' })
      expect(updated?.status).toBe('APPROVED')
    })

    it('updateApplication — updates aadhaarName', () => {
      const customer = mockDb.createCustomer('9001000005')
      const app = mockDb.createApplication(customer.id)
      mockDb.updateApplication(app.id, { aadhaarName: 'Aarav Sharma' })
      const found = mockDb.findApplicationById(app.id)
      expect(found?.aadhaarName).toBe('Aarav Sharma')
    })

    it('updateApplication — returns null for unknown id', () => {
      expect(mockDb.updateApplication('fake-id', { status: 'APPROVED' })).toBeNull()
    })

    it('listApplications — returns array with customer + documents', () => {
      const customer = mockDb.createCustomer('9001000006')
      mockDb.createApplication(customer.id)
      const list = mockDb.listApplications()
      expect(Array.isArray(list)).toBe(true)
      expect(list[0]).toHaveProperty('customer')
      expect(list[0]).toHaveProperty('documents')
    })
  })

  describe('documents', () => {
    it('createDocument — creates document entry', () => {
      const customer = mockDb.createCustomer('9002000001')
      const app = mockDb.createApplication(customer.id)
      const doc = mockDb.createDocument(app.id, 'PAN', 'https://storage/pan.jpg', 'pan.jpg')
      expect(doc.type).toBe('PAN')
      expect(doc.fileUrl).toBe('https://storage/pan.jpg')
    })

    it('createDocument — replaces existing doc of same type', () => {
      const customer = mockDb.createCustomer('9002000002')
      const app = mockDb.createApplication(customer.id)
      mockDb.createDocument(app.id, 'AADHAAR', 'url1', 'file1.jpg')
      mockDb.createDocument(app.id, 'AADHAAR', 'url2', 'file2.jpg')
      const docs = mockDb.findDocumentsByApplicationId(app.id)
      const aadhaarDocs = docs.filter(d => d.type === 'AADHAAR')
      expect(aadhaarDocs).toHaveLength(1)
      expect(aadhaarDocs[0].fileUrl).toBe('url2')
    })

    it('findDocumentsByApplicationId — returns all documents', () => {
      const customer = mockDb.createCustomer('9002000003')
      const app = mockDb.createApplication(customer.id)
      mockDb.createDocument(app.id, 'PAN', 'url-pan', 'pan.jpg')
      mockDb.createDocument(app.id, 'PHOTO', 'url-photo', 'photo.jpg')
      const docs = mockDb.findDocumentsByApplicationId(app.id)
      expect(docs).toHaveLength(2)
    })
  })

  describe('consent_logs', () => {
    it('createConsentLog — creates log entry', () => {
      const log = mockDb.createConsentLog('customer-1', 'AADHAAR_UIDAI_CONSENT', true, '127.0.0.1', null)
      expect(log.type).toBe('AADHAAR_UIDAI_CONSENT')
      expect(log.consentGiven).toBe(true)
      expect(log.ipAddress).toBe('127.0.0.1')
    })

    it('createConsentLog — works with null customerId', () => {
      const log = mockDb.createConsentLog(null, 'MOBILE_OTP', true, '127.0.0.1', null)
      expect(log.customerId).toBeNull()
    })
  })

  describe('audit_logs', () => {
    it('createAuditLog — creates audit entry', () => {
      const log = mockDb.createAuditLog('user-1', 'OTP_VERIFIED', 'OTP verified for +91...', '127.0.0.1')
      expect(log.action).toBe('OTP_VERIFIED')
      expect(log.userId).toBe('user-1')
    })

    it('listAuditLogs — returns array', () => {
      mockDb.createAuditLog(null, 'ADMIN_LOGIN', null, '127.0.0.1')
      const logs = mockDb.listAuditLogs()
      expect(Array.isArray(logs)).toBe(true)
      expect(logs.length).toBeGreaterThan(0)
    })
  })
})
