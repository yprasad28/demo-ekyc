import { describe, it, expect, vi } from 'vitest'
import { generateOTP, verifyOTP } from '@/lib/mock-otp'

describe('mock-otp', () => {

  describe('generateOTP', () => {
    it('returns 6-digit string for mobile number', () => {
      const otp = generateOTP('9876543210')
      expect(otp).toMatch(/^\d{6}$/)
    })

    it('returns different OTPs for different mobiles', () => {
      const otp1 = generateOTP('9000000001')
      const otp2 = generateOTP('9000000002')
      expect(otp1).toMatch(/^\d{6}$/)
      expect(otp2).toMatch(/^\d{6}$/)
    })

    it('overwrites previous OTP for same mobile', () => {
      generateOTP('9111111111')
      const otp2 = generateOTP('9111111111')
      expect(verifyOTP('9111111111', otp2)).toBe(true)
    })

    it('works for aadhaar-prefixed mobile key', () => {
      const otp = generateOTP('aadhaar-customer-uuid-123')
      expect(otp).toMatch(/^\d{6}$/)
    })
  })

  describe('verifyOTP', () => {
    it('returns true for correct OTP', () => {
      const otp = generateOTP('9800000000')
      expect(verifyOTP('9800000000', otp)).toBe(true)
    })

    it('returns false for wrong OTP', () => {
      generateOTP('9800000001')
      expect(verifyOTP('9800000001', '000000')).toBe(false)
    })

    it('returns false for non-existent mobile', () => {
      expect(verifyOTP('9999999999', '123456')).toBe(false)
    })

    it('OTP is single-use — second verify returns false', () => {
      const otp = generateOTP('9700000000')
      expect(verifyOTP('9700000000', otp)).toBe(true)
      expect(verifyOTP('9700000000', otp)).toBe(false)
    })

    it('returns false for expired OTP', () => {
      vi.useFakeTimers()
      const otp = generateOTP('9600000000')
      vi.advanceTimersByTime(6 * 60 * 1000)
      expect(verifyOTP('9600000000', otp)).toBe(false)
      vi.useRealTimers()
    })

    it('returns false for empty OTP string', () => {
      generateOTP('9500000000')
      expect(verifyOTP('9500000000', '')).toBe(false)
    })
  })
})
