import { describe, it, expect } from 'vitest'
import { verifyPanRecord, fuzzyNameMatch, mockPanDb } from '@/lib/mock-pan'

describe('mock-pan', () => {

  describe('verifyPanRecord', () => {
    it('returns PAN record for ABCDE1234F', () => {
      const record = verifyPanRecord('ABCDE1234F')
      expect(record).not.toBeNull()
      expect(record?.name).toBe('AARAV SHARMA')
      expect(record?.status).toBe('ACTIVE')
      expect(record?.panType).toBe('INDIVIDUAL')
    })

    it('handles lowercase input — converts to uppercase', () => {
      const record = verifyPanRecord('abcde1234f')
      expect(record).not.toBeNull()
      expect(record?.panNumber).toBe('ABCDE1234F')
    })

    it('returns null for unknown PAN', () => {
      expect(verifyPanRecord('ZZZZZ9999Z')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(verifyPanRecord('')).toBeNull()
    })

    it('returns Priya Patel record for XYZAB5678C', () => {
      const record = verifyPanRecord('XYZAB5678C')
      expect(record?.name).toBe('PRIYA K PATEL')
    })

    it('all 5 PAN records exist in mockPanDb', () => {
      expect(Object.keys(mockPanDb)).toHaveLength(5)
    })

    it('all records have panNumber, name, dob, status, panType', () => {
      Object.values(mockPanDb).forEach(record => {
        expect(record).toHaveProperty('panNumber')
        expect(record).toHaveProperty('name')
        expect(record).toHaveProperty('dob')
        expect(record).toHaveProperty('status')
        expect(record).toHaveProperty('panType')
      })
    })

    it('all status values are ACTIVE or INACTIVE', () => {
      Object.values(mockPanDb).forEach(record => {
        expect(['ACTIVE', 'INACTIVE']).toContain(record.status)
      })
    })
  })

  describe('fuzzyNameMatch', () => {
    it('returns 100 for identical names', () => {
      expect(fuzzyNameMatch('AARAV SHARMA', 'AARAV SHARMA')).toBe(100)
    })

    it('returns 100 for case-insensitive identical names', () => {
      expect(fuzzyNameMatch('aarav sharma', 'AARAV SHARMA')).toBe(100)
    })

    it('returns high score (>=80) for Aarav Sharma vs AARAV SHARMA', () => {
      const score = fuzzyNameMatch('Aarav Sharma', 'AARAV SHARMA')
      expect(score).toBeGreaterThanOrEqual(80)
    })

    it('returns high score for name with middle initial — Priya Patel vs PRIYA K PATEL', () => {
      const score = fuzzyNameMatch('Priya Patel', 'PRIYA K PATEL')
      expect(score).toBeGreaterThanOrEqual(60)
    })

    it('returns low score (<40) for completely different names', () => {
      const score = fuzzyNameMatch('AARAV SHARMA', 'ANANYA DAS')
      expect(score).toBeLessThan(40)
    })

    it('returns 100 for empty strings (both equal)', () => {
      expect(fuzzyNameMatch('', '')).toBe(100)
    })

    it('returns number between 0 and 100', () => {
      const score = fuzzyNameMatch('RAHUL VERMA', 'RAHUL KUMAR')
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('is symmetrical — A vs B equals B vs A', () => {
      const s1 = fuzzyNameMatch('AARAV SHARMA', 'AMIT JOSHI')
      const s2 = fuzzyNameMatch('AMIT JOSHI', 'AARAV SHARMA')
      expect(s1).toBe(s2)
    })
  })
})
