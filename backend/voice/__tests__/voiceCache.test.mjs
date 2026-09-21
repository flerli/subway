import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  buildVoiceCacheKey,
  ensureVoiceCacheDir,
  evictVoiceCache,
  lookupVoiceCache,
  normalizeTtsLang,
  normalizeVoiceName,
  sanitizeVoiceUserId,
  storeVoiceCache,
  validateSynthesisText,
  voiceCacheFilePath,
  VOICE_SDK_VERSION,
} from '../voiceCache.mjs'

let scratchDir = null

beforeEach(() => {
  scratchDir = mkdtempSync(join(tmpdir(), 'voice-cache-test-'))
})

afterEach(() => {
  if (scratchDir) {
    rmSync(scratchDir, { recursive: true, force: true })
    scratchDir = null
  }
})

describe('voiceCache keys', () => {
  it('is stable and hex-shaped (positive)', () => {
    const key = buildVoiceCacheKey({ text: 'Hallo', voice: 'M1', lang: 'de' })
    assert.match(key, /^[0-9a-f]{64}$/)
    assert.equal(key, buildVoiceCacheKey({ text: 'Hallo', voice: 'M1', lang: 'de' }))
  })

  it('separates voice and language (positive: no cross-voice serving)', () => {
    const base = buildVoiceCacheKey({ text: 'Hallo', voice: 'M1', lang: 'de' })
    assert.notEqual(base, buildVoiceCacheKey({ text: 'Hallo', voice: 'F1', lang: 'de' }))
    assert.notEqual(base, buildVoiceCacheKey({ text: 'Hallo', voice: 'M1', lang: 'en' }))
    assert.notEqual(base, buildVoiceCacheKey({ text: 'Hallo!', voice: 'M1', lang: 'de' }))
  })

  it('versions the SDK pin (positive: upgrades invalidate)', () => {
    const pinned = buildVoiceCacheKey({ text: 'Hallo', voice: 'M1', lang: 'de' })
    const bumped = buildVoiceCacheKey({ text: 'Hallo', voice: 'M1', lang: 'de', sdkVersion: '9.9.9' })
    assert.notEqual(pinned, bumped)
    assert.equal(VOICE_SDK_VERSION, '1.3.1')
  })

  it('never embeds raw text in file paths (negative: privacy)', () => {
    const filePath = voiceCacheFilePath({ cacheDir: scratchDir, userId: 'user-1', key: buildVoiceCacheKey({ text: 'my secret', voice: 'M1', lang: 'de' }) })
    assert.ok(!filePath.includes('secret'))
  })
})

describe('voiceCache validation', () => {
  it('normalizes voice presets case-insensitively (positive + negative)', () => {
    assert.equal(normalizeVoiceName('m1'), 'M1')
    assert.equal(normalizeVoiceName(' F3 '), 'F3')
    assert.equal(normalizeVoiceName('M6'), null)
    assert.equal(normalizeVoiceName('custom-voice'), null)
    assert.equal(normalizeVoiceName(null), null)
  })

  it('falls back to na for unknown languages (positive + negative)', () => {
    assert.equal(normalizeTtsLang('de'), 'de')
    assert.equal(normalizeTtsLang(' DE '), 'de')
    assert.equal(normalizeTtsLang('xx'), 'na')
    assert.equal(normalizeTtsLang(null), 'na')
  })

  it('bounds synthesis text (positive + negative)', () => {
    assert.equal(validateSynthesisText('  Hallo  '), 'Hallo')
    assert.equal(validateSynthesisText(''), null)
    assert.equal(validateSynthesisText('   '), null)
    assert.equal(validateSynthesisText('x'.repeat(1001)), null)
    assert.equal(validateSynthesisText('x'.repeat(1000))?.length, 1000)
    assert.equal(validateSynthesisText(null), null)
  })

  it('sanitizes user scopes against traversal (negative: security)', () => {
    assert.equal(sanitizeVoiceUserId('user-flerlage'), 'user-flerlage')
    const hostile = sanitizeVoiceUserId('../../etc/passwd')
    assert.ok(hostile !== null && !hostile.includes('/') && !hostile.includes('.'))
    assert.equal(sanitizeVoiceUserId(''), null)
    assert.equal(sanitizeVoiceUserId(null), null)
  })
})

describe('voiceCache store/lookup/evict', () => {
  it('round-trips bytes per user (positive + isolation)', () => {
    ensureVoiceCacheDir(scratchDir, 'user-a')
    ensureVoiceCacheDir(scratchDir, 'user-b')
    const pathA = voiceCacheFilePath({ cacheDir: scratchDir, userId: 'user-a', key: 'k1' })
    const pathB = voiceCacheFilePath({ cacheDir: scratchDir, userId: 'user-b', key: 'k1' })
    assert.notEqual(pathA, pathB)
    storeVoiceCache(pathA, Buffer.from('audio-a'))
    assert.equal(lookupVoiceCache(pathA)?.toString(), 'audio-a')
    assert.equal(lookupVoiceCache(pathB), null)
  })

  it('misses on absent files and expires by age (negative)', () => {
    assert.equal(lookupVoiceCache(join(scratchDir, 'user-a', 'nope.wav')), null)
    ensureVoiceCacheDir(scratchDir, 'user-a')
    const filePath = voiceCacheFilePath({ cacheDir: scratchDir, userId: 'user-a', key: 'k2' })
    storeVoiceCache(filePath, Buffer.from('x'))
    assert.equal(lookupVoiceCache(filePath, -1), null)
  })

  it('evicts expired entries regardless of budget (positive)', () => {
    ensureVoiceCacheDir(scratchDir, 'user-a')
    const filePath = voiceCacheFilePath({ cacheDir: scratchDir, userId: 'user-a', key: 'old' })
    storeVoiceCache(filePath, Buffer.from('old-bytes'))
    const ancient = new Date('2000-01-01')
    utimesSync(filePath, ancient, ancient)
    const result = evictVoiceCache(scratchDir, { maxAgeMs: 1000, maxBytes: 10 ** 9, nowMs: Date.now() })
    assert.equal(result.evictedFiles, 1)
    assert.equal(lookupVoiceCache(filePath), null)
  })

  it('evicts oldest-first beyond the byte budget (positive)', () => {
    ensureVoiceCacheDir(scratchDir, 'user-a')
    const paths = ['k-old', 'k-mid', 'k-new'].map((key) => {
      const filePath = voiceCacheFilePath({ cacheDir: scratchDir, userId: 'user-a', key })
      storeVoiceCache(filePath, Buffer.alloc(10, 1))
      return filePath
    })
    const now = Date.now()
    utimesSync(paths[0], new Date(now - 3000), new Date(now - 3000))
    utimesSync(paths[1], new Date(now - 2000), new Date(now - 2000))
    utimesSync(paths[2], new Date(now - 1000), new Date(now - 1000))
    const result = evictVoiceCache(scratchDir, { maxAgeMs: 10 ** 12, maxBytes: 20, nowMs: now })
    assert.equal(result.evictedFiles, 1)
    assert.equal(lookupVoiceCache(paths[0], 10 ** 12, now), null)
    assert.ok(lookupVoiceCache(paths[2], 10 ** 12, now) !== null)
  })

  it('tolerates a missing cache dir (negative)', () => {
    const result = evictVoiceCache(join(scratchDir, 'absent'))
    assert.deepEqual(result, { evictedFiles: 0, evictedBytes: 0 })
  })
})
