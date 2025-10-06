import crypto from 'crypto'

/**
 * Generate HMAC SHA256 signature
 */
export function generateHmacSignature(
  payload: string | Buffer,
  secret: string
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

/**
 * Verify HMAC SHA256 signature
 */
export function verifyHmacSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateHmacSignature(payload, secret)
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

/**
 * Generate idempotency key from multiple values
 */
export function generateIdempotencyKey(...values: (string | number)[]): string {
  const payload = values.join('-')
  return crypto
    .createHash('sha256')
    .update(payload)
    .digest('hex')
}

/**
 * Generate random ID
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitive(value: string): string {
  if (!value || value.length < 8) return '***'
  return value.substring(0, 3) + '***' + value.substring(value.length - 3)
}
