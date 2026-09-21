import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Voice prefs + sample route tests (TC-B-03): live server, seeded account.
 * Password comes from the server default seed (committed dev credential,
 * kiosk-internal; never a real secret). Per-user isolation (two users) is
 * owned by the TC-B-04 closer suite; this file proves auth + validation +
 * persistence round-trips.
 */

const here = dirname(fileURLToPath(import.meta.url))
const backendDir = join(here, '..', '..')
const TEST_PORT = 18788
const baseUrl = `http://127.0.0.1:${TEST_PORT}`
const SEED_PASSWORD = 'xupjo0-hyhdoF-tovsuc'

let server = null
let cookies = ''

const waitForBoot = async (deadlineMs = 30000) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < deadlineMs) {
    try {
      const response = await fetch(`${baseUrl}/api/auth/session`)
      if (response.status === 200) {
        return
      }
    } catch {
      // Not listening yet; keep polling.
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 200)
    })
  }
  throw new Error('Voice prefs test server did not boot in time.')
}

const login = async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'flerlage', password: SEED_PASSWORD }),
  })
  assert.equal(response.status, 200)
  const setCookie = response.headers.get('set-cookie') ?? ''
  cookies = setCookie.split(';')[0]
}

before(async () => {
  server = spawn('node', ['server.mjs'], {
    cwd: backendDir,
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdio: 'ignore',
  })
  await waitForBoot()
  await login()
})

after(() => {
  try {
    server?.kill('SIGTERM')
  } catch {
    // Best effort teardown.
  }
})

describe('voice preferences routes', () => {
  it('denies unauthenticated reads and writes (negative)', async () => {
    const read = await fetch(`${baseUrl}/api/voice/preferences`)
    assert.equal(read.status, 401)
    const write = await fetch(`${baseUrl}/api/voice/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttsEnabled: false }),
    })
    assert.equal(write.status, 401)
  })

  it('returns defaults for a fresh user (positive)', async () => {
    const response = await fetch(`${baseUrl}/api/voice/preferences`, {
      headers: { Cookie: cookies },
    })
    assert.equal(response.status, 200)
    const payload = await response.json()
    const voicePreferences = payload.voicePreferences
    assert.equal(voicePreferences.ttsEnabled, true)
    assert.equal(voicePreferences.voice, 'F1')
    assert.equal(voicePreferences.volume, 80)
  })

  it('persists updates (incl. speed) and reflects them on read (positive)', async () => {
    const write = await fetch(`${baseUrl}/api/voice/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookies },
      body: JSON.stringify({ ttsEnabled: false, voice: 'M3', volume: 35, speed: 1.4 }),
    })
    assert.equal(write.status, 200)
    const writePayload = await write.json()
    const voicePreferences = writePayload.voicePreferences
    assert.equal(voicePreferences.ttsEnabled, false)
    assert.equal(voicePreferences.voice, 'M3')
    assert.equal(voicePreferences.volume, 35)
    assert.equal(voicePreferences.speed, 1.4)
    assert.ok(typeof voicePreferences.updatedAt === 'string')

    const read = await fetch(`${baseUrl}/api/voice/preferences`, {
      headers: { Cookie: cookies },
    })
    const readPayload = await read.json()
    assert.equal(readPayload.voicePreferences.voice, 'M3')
    assert.equal(readPayload.voicePreferences.speed, 1.4)
    // Restore defaults so the shared dev DB stays clean.
    await fetch(`${baseUrl}/api/voice/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookies },
      body: JSON.stringify({ ttsEnabled: true, voice: 'F1', volume: 80, speed: 1.2 }),
    })
  })

  it('clamps out-of-range speed server-side (negative)', async () => {
    const write = await fetch(`${baseUrl}/api/voice/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookies },
      body: JSON.stringify({ speed: 9 }),
    })
    assert.equal(write.status, 200)
    const payload = await write.json()
    assert.equal(payload.voicePreferences.speed, 1.5)
    await fetch(`${baseUrl}/api/voice/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookies },
      body: JSON.stringify({ speed: 1.2 }),
    })
  })

  it('rejects unknown voices and out-of-range volume (negative)', async () => {
    const badVoice = await fetch(`${baseUrl}/api/voice/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookies },
      body: JSON.stringify({ voice: 'Z9' }),
    })
    assert.equal(badVoice.status, 400)

    const badVolume = await fetch(`${baseUrl}/api/voice/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookies },
      body: JSON.stringify({ volume: 150 }),
    })
    assert.equal(badVolume.status, 400)
  })

  it('denies unauthenticated sample requests and serves a sample for known voices (positive)', async () => {
    const unauth = await fetch(`${baseUrl}/api/voice/samples/M1?lang=en`)
    assert.equal(unauth.status, 401)

    const badVoice = await fetch(`${baseUrl}/api/voice/samples/Z9`, {
      headers: { Cookie: cookies },
    })
    assert.equal(badVoice.status, 400)

    const sample = await fetch(`${baseUrl}/api/voice/samples/M1?lang=en`, {
      headers: { Cookie: cookies },
    })

    if (sample.status === 503) {
      console.log('GATE SKIPPED: TTS engine unavailable in this environment (no weights staged).')
      return
    }

    assert.equal(sample.status, 200)
    const samplePayload = await sample.json()
    const voice = samplePayload.voice
    assert.equal(voice.mimeType, 'audio/wav')
    assert.equal(voice.voice, 'M1')
    const bytes = Buffer.from(voice.audioBase64, 'base64')
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF')
  })
})