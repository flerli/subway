import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Per-user TTS disk cache (SW-REQ-013-02).
 *
 * Key = SHA256(sdkVersion + text + voice + language): voice and language are
 * always part of the key, so one user's voice can never serve another voice's
 * audio. Entries live under `<cacheDir>/<safeUserId>/<key>.wav`.
 * Eviction: age (default 7 days) + total size (default 500 MB), oldest first.
 * Raw text never appears in file names — only the hash does.
 */

export const VOICE_SDK_VERSION = '1.3.1'
export const VOICE_CACHE_MAX_TEXT_CHARS = 1000
export const VOICE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
export const VOICE_CACHE_MAX_BYTES = 500 * 1024 * 1024

export const VOICE_PRESET_VOICES = Object.freeze([
  'M1', 'M2', 'M3', 'M4', 'M5', 'F1', 'F2', 'F3', 'F4', 'F5',
])

/** Speaking-speed range (Supertonic `speed` parameter, 1.0 = neutral). */
export const VOICE_SPEED_MIN = 0.75
export const VOICE_SPEED_MAX = 1.5

/**
 * Default speaking speed: 15% faster than the SDK's 1.05 baseline
 * (1.05 × 1.15 ≈ 1.21) — user-chosen default for assistant answers.
 */
export const VOICE_DEFAULT_SPEED = 1.2

/** Clamp any speed into the supported range; non-finite falls back to default. */
export const normalizeVoiceSpeed = (value) => {
  const speed = typeof value === 'number' && Number.isFinite(value) ? value : VOICE_DEFAULT_SPEED
  return Math.min(VOICE_SPEED_MAX, Math.max(VOICE_SPEED_MIN, speed))
}

export const VOICE_TTS_LANGS = Object.freeze([
  'en', 'ko', 'ja', 'ar', 'bg', 'cs', 'da', 'de', 'el', 'es', 'et',
  'fi', 'fr', 'hi', 'hr', 'hu', 'id', 'it', 'lt', 'lv', 'nl', 'pl',
  'pt', 'ro', 'ru', 'sk', 'sl', 'sv', 'tr', 'uk', 'vi', 'na',
])

/** Canonical voice preset or null (case-insensitive input). */
export const normalizeVoiceName = (value) => {
  const voice = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return VOICE_PRESET_VOICES.includes(voice) ? voice : null
}

/** Known TTS language or the `na` agnostic fallback (never rejects). */
export const normalizeTtsLang = (value) => {
  const lang = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return VOICE_TTS_LANGS.includes(lang) ? lang : 'na'
}

/** Synthesis text or null when missing/over the cap. */
export const validateSynthesisText = (value, maxChars = VOICE_CACHE_MAX_TEXT_CHARS) => {
  if (typeof value !== 'string') {
    return null
  }
  const text = value.trim()
  if (text.length === 0 || text.length > maxChars) {
    return null
  }
  return text
}

/** Filesystem-safe user scope (server user ids are already safe; defense in depth). */
export const sanitizeVoiceUserId = (userId) => {
  if (typeof userId !== 'string' || userId.length === 0) {
    return null
  }
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
  return safe.length > 0 ? safe : null
}

export const buildVoiceCacheKey = ({ text, voice, lang, speed = VOICE_DEFAULT_SPEED, sdkVersion = VOICE_SDK_VERSION }) =>
  createHash('sha256')
    .update(`${sdkVersion}|${text}|${voice}|${lang}|${normalizeVoiceSpeed(speed)}`, 'utf8')
    .digest('hex')

export const voiceCacheFilePath = ({ cacheDir, userId, key }) =>
  join(cacheDir, userId, `${key}.wav`)

export const ensureVoiceCacheDir = (cacheDir, userId) => {
  const dir = join(cacheDir, userId)
  mkdirSync(dir, { recursive: true })
  return dir
}

/** Cached WAV bytes or null (missing, unreadable, or older than maxAgeMs). */
export const lookupVoiceCache = (filePath, maxAgeMs = VOICE_CACHE_MAX_AGE_MS, nowMs = Date.now()) => {
  let stat = null
  try {
    stat = statSync(filePath)
  } catch {
    return null
  }
  if (!stat.isFile() || nowMs - stat.mtimeMs > maxAgeMs) {
    return null
  }
  try {
    return readFileSync(filePath)
  } catch {
    return null
  }
}

export const storeVoiceCache = (filePath, bytes) => {
  writeFileSync(filePath, bytes)
}

/**
 * Evict expired entries, then largest-oldest beyond the byte budget.
 * Returns { evictedFiles, evictedBytes }. Never throws (best effort).
 */
export const evictVoiceCache = (
  cacheDir,
  { maxAgeMs = VOICE_CACHE_MAX_AGE_MS, maxBytes = VOICE_CACHE_MAX_BYTES, nowMs = Date.now() } = {},
) => {
  const result = { evictedFiles: 0, evictedBytes: 0 }
  let entries = []
  try {
    entries = collectVoiceCacheEntries(cacheDir)
  } catch {
    return result
  }

  const removeEntry = (entry) => {
    try {
      unlinkSync(entry.path)
      result.evictedFiles += 1
      result.evictedBytes += entry.size
      return true
    } catch {
      return false
    }
  }

  entries = entries.filter((entry) => {
    if (nowMs - entry.mtimeMs > maxAgeMs) {
      return !removeEntry(entry)
    }
    return true
  })

  let totalBytes = entries.reduce((sum, entry) => sum + entry.size, 0)
  entries.sort((left, right) => left.mtimeMs - right.mtimeMs)

  for (const entry of entries) {
    if (totalBytes <= maxBytes) {
      break
    }
    if (removeEntry(entry)) {
      totalBytes -= entry.size
    }
  }

  return result
}

const collectVoiceCacheEntries = (cacheDir) => {
  const entries = []
  if (!existsSync(cacheDir)) {
    return entries
  }
  for (const userDir of readdirSync(cacheDir, { withFileTypes: true })) {
    if (!userDir.isDirectory()) {
      continue
    }
    const dirPath = join(cacheDir, userDir.name)
    for (const file of readdirSync(dirPath, { withFileTypes: true })) {
      if (!file.isFile() || !file.name.endsWith('.wav')) {
        continue
      }
      const filePath = join(dirPath, file.name)
      try {
        const stat = statSync(filePath)
        entries.push({ path: filePath, size: stat.size, mtimeMs: stat.mtimeMs })
      } catch {
        continue
      }
    }
  }
  return entries
}
