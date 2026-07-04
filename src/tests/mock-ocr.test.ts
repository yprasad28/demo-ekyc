import { describe, it, expect, vi } from 'vitest'
import { performOcr } from '@/lib/mock-ocr'

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({
    recognize: vi.fn().mockResolvedValue({ data: { text: '' } }),
    terminate: vi.fn(),
  }),
}))

describe('mock-ocr', () => {

  it('detects PAN from filename containing PAN format', async () => {
    const result = await performOcr('/mock/image.jpg', 'ABCDE1234F.jpg')
    expect(result.detectedPan).toBe('ABCDE1234F')
    expect(result.success).toBe(true)
  })

  it('detects Aadhaar from 12-digit numeric filename', async () => {
    const result = await performOcr('/mock/image.jpg', '123456789012.jpg')
    expect(result.detectedAadhaar).toBe('123456789012')
    expect(result.success).toBe(true)
  })

  it('falls back to ABCDE1234F for filename containing "pan"', async () => {
    const result = await performOcr('/mock/image.jpg', 'pan-document.jpg')
    expect(result.detectedPan).toBe('ABCDE1234F')
    expect(result.success).toBe(true)
  })

  it('falls back to 123456789012 for filename containing "aadhaar"', async () => {
    const result = await performOcr('/mock/image.jpg', 'aadhaar-card.jpg')
    expect(result.detectedAadhaar).toBe('123456789012')
    expect(result.success).toBe(true)
  })

  it('returns OcrResult shape with all required fields', async () => {
    const result = await performOcr('/mock/image.jpg', 'pan.jpg')
    expect(result).toHaveProperty('text')
    expect(result).toHaveProperty('detectedPan')
    expect(result).toHaveProperty('detectedAadhaar')
    expect(result).toHaveProperty('success')
  })

  it('success false when no filename and no valid image path', async () => {
    const result = await performOcr('invalid-path-no-prefix')
    expect(result.success).toBe(false)
    expect(result.detectedPan).toBeNull()
    expect(result.detectedAadhaar).toBeNull()
  })
})
