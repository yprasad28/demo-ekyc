import { describe, it, expect } from 'vitest'
import { getAadhaarProfile, mockAadhaarDb } from '@/lib/mock-aadhaar'

describe('mock-aadhaar', () => {
  
  describe('getAadhaarProfile', () => {
    it('returns profile for valid Aadhaar 123456789012', () => {
      const profile = getAadhaarProfile('123456789012')
      expect(profile).not.toBeNull()
      expect(profile?.name).toBe('Aarav Sharma')
      expect(profile?.dob).toBe('1990-05-15')
      expect(profile?.gender).toBe('M')
      expect(profile?.maskedAadhaar).toBe('XXXX XXXX 9012')
    })

    it('strips spaces from Aadhaar input — "1234 5678 9012" matches', () => {
      const profile = getAadhaarProfile('1234 5678 9012')
      expect(profile).not.toBeNull()
      expect(profile?.name).toBe('Aarav Sharma')
    })

    it('returns null for unknown Aadhaar number', () => {
      const profile = getAadhaarProfile('000000000000')
      expect(profile).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(getAadhaarProfile('')).toBeNull()
    })

    it('returns Priya Patel for 987654321098', () => {
      const profile = getAadhaarProfile('987654321098')
      expect(profile?.name).toBe('Priya Patel')
      expect(profile?.gender).toBe('F')
    })

    it('returns Rahul Verma for 111122223333', () => {
      const profile = getAadhaarProfile('111122223333')
      expect(profile?.name).toBe('Rahul Verma')
    })

    it('all 5 profiles exist in mockAadhaarDb', () => {
      const keys = Object.keys(mockAadhaarDb)
      expect(keys).toHaveLength(5)
    })

    it('all profiles have required fields', () => {
      Object.values(mockAadhaarDb).forEach(profile => {
        expect(profile).toHaveProperty('name')
        expect(profile).toHaveProperty('dob')
        expect(profile).toHaveProperty('gender')
        expect(profile).toHaveProperty('address')
        expect(profile).toHaveProperty('maskedAadhaar')
        expect(profile).toHaveProperty('photo')
      })
    })

    it('all maskedAadhaar values follow XXXX XXXX XXXX format', () => {
      Object.values(mockAadhaarDb).forEach(profile => {
        expect(profile.maskedAadhaar).toMatch(/^XXXX XXXX \d{4}$/)
      })
    })

    it('all photo values are SVG data URIs', () => {
      Object.values(mockAadhaarDb).forEach(profile => {
        expect(profile.photo).toMatch(/^data:image\/svg\+xml/)
      })
    })

    it('gender values are only M or F', () => {
      Object.values(mockAadhaarDb).forEach(profile => {
        expect(['M', 'F']).toContain(profile.gender)
      })
    })
  })
})
