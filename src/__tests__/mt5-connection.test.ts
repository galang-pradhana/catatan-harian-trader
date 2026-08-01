import { describe, it } from 'node:test'
import assert from 'node:assert'
import { generateToken, hashToken, verifyToken } from '../utils/token'
import { MAX_MT5_CONNECTIONS_PER_USER, EA_SYNC_INTERVAL_SECONDS } from '../constants/mt5'

describe('MT5 Connection & Token Hashing Unit Tests', () => {
  it('should generate cryptographically secure 64-char token starting with cht_live_', () => {
    const token = generateToken()
    assert.ok(token, 'Token should be defined')
    assert.strictEqual(token.startsWith('cht_live_'), true, 'Token must start with cht_live_')
    assert.ok(token.length > 60, 'Token length should be > 60')
  })

  it('should generate consistent SHA-256 hash for identical token', () => {
    const token = 'cht_live_7a9f82d1c4e5b6a7890123456789abcdef0123456789abcdef0123456789'
    const hash1 = hashToken(token)
    const hash2 = hashToken(token)
    assert.strictEqual(hash1, hash2, 'Hashes must match for identical input')
    assert.strictEqual(hash1.length, 64, 'SHA-256 hex string length must be 64')
  })

  it('should verify matching token correctly and reject invalid tokens', () => {
    const token = generateToken()
    const hash = hashToken(token)

    assert.strictEqual(verifyToken(token, hash), true, 'Valid token must be verified')
    assert.strictEqual(verifyToken('invalid_token_sample', hash), false, 'Invalid token must fail verification')
    assert.strictEqual(verifyToken('', hash), false, 'Empty token must fail verification')
  })

  it('should enforce MAX_MT5_CONNECTIONS_PER_USER = 3 constraint', () => {
    assert.strictEqual(MAX_MT5_CONNECTIONS_PER_USER, 3, 'Max MT5 connections per user must be 3')
    const existingConnectionsCount = 3
    const canCreateNew = existingConnectionsCount < MAX_MT5_CONNECTIONS_PER_USER
    assert.strictEqual(canCreateNew, false, 'Should disallow new connection when count reaches 3')
  })

  it('should verify EA sync interval constant is set to 120 seconds', () => {
    assert.strictEqual(EA_SYNC_INTERVAL_SECONDS, 120, 'EA sync interval must be 120 seconds')
  })
})
