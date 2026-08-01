import crypto from 'crypto'

/**
 * Generates a random 64-character cryptographically secure API token with prefix 'cht_live_'
 */
export function generateToken(): string {
  const randomBytes = crypto.randomBytes(32).toString('hex')
  return `cht_live_${randomBytes}`
}

/**
 * Hashes an API token using SHA-256 algorithm
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex')
}

/**
 * Verifies if a plain text token matches a SHA-256 hash
 */
export function verifyToken(token: string, hash: string): boolean {
  if (!token || !hash) return false
  const computedHash = hashToken(token)
  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash))
}
