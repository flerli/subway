import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { randomBytes, scryptSync } from 'node:crypto'

/**
 * SWE5 two-session per-user isolation (TC-B-04, SW-REQ-013-03 #2).
 *
 * Spawns the real server on an isolated temp data dir (BACKEND_DATA_DIR),
 * seeds a second user directly (hash format mirrors server.mjs:
 * `scrypt$salt$hash` with scryptSync(password, salt, 64)), then proves:
 * user B cannot see user A's saved prefs, and B's writes never touch A's row.
 */

const here = dirname(fileURLToPath(import.meta.url))
const backendDir = join(here, '..', '..')
const TEST_PORT = 18789
const baseUrl = `http://127.0.0.1:${TEST_PORT}`
const PASSWORD_A = 'alpha-password-a'
const PASSWORD_B = 'beta-password-b'

let server = null
let workDir = null
let cookieA = ''
let cookieB = ''

const seedUser = (db, id, username, password) => {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO users (id, username, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, username, `scrypt$${salt}$${hash}`, now, now)
}

const waitForBoot = async (deadlineMs = 30000) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < deadlineMs) {
    try {
      const response = await fetch(`${baseUrl}/api/auth/session`)
      if (response.status === 200) {
        return
      }
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 200)
    })
  }
  throw new Error('Isolation test server did not boot in time.')
}

const login = async (username, password) => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  assert.equal(response.status, 200)
  return (response.headers.get('set-cookie') ?? '').split(';')[0]
}

const getPrefs = (cookie) =>
  fetch(`${baseUrl}/api/voice/preferences`, {
    headers: { Cookie: cookie },
  }).then((response) => {
    assert.equal(response.status, 200)
    return response.json()
  })

const putPrefs = (cookie, body) =>
  fetch(`${baseUrl}/api/voice/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  })

before(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'subway-isolation-'))
  server = spawn('node', ['server.mjs'], {
    cwd: backendDir,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      BACKEND_DATA_DIR: workDir,
      INITIAL_USER_PASSWORD: PASSWORD_A,
    },
    stdio: 'ignore',
  })
  await waitForBoot()

  // Seed the second user while the server is up (it only seeds flerlage).
  const dbPath = join(workDir, 'subway.sqlite')
  const db = new DatabaseSync(dbPath)
  try {
    seedUser(db, 'user-second', 'second', PASSWORD_B)
  } finally {
    db.close()
  }

  cookieA = await login('flerlage', PASSWORD_A)
  cookieB = await login('second', PASSWORD_B)
})

after(() => {
  try {
    server?.kill('SIGTERM')
  } catch {
    // Best effort teardown.
  }
  if (workDir) {
    rmSync(workDir, { recursive: true, force: true })
  }
})

describe('voice prefs two-session isolation (SWE5)', () => {
  it('user B cannot read user A s saved prefs (denial of read)', async () => {
    const written = await putPrefs(cookieA, { ttsEnabled: false, voice: 'M3', volume: 35 })
    assert.equal(written.status, 200)

    const payloadB = await getPrefs(cookieB)
    assert.equal(payloadB.voicePreferences.voice, 'F1')
    assert.equal(payloadB.voicePreferences.ttsEnabled, true)
    assert.equal(payloadB.voicePreferences.volume, 80)
  })

  it('user B s writes never affect user A s prefs (denial of write)', async () => {
    await putPrefs(cookieB, { ttsEnabled: true, voice: 'F5', volume: 60 })

    const payloadA = await getPrefs(cookieA)
    assert.equal(payloadA.voicePreferences.voice, 'M3')
    assert.equal(payloadA.voicePreferences.ttsEnabled, false)
    assert.equal(payloadA.voicePreferences.volume, 35)
  })

  it('unauthenticated calls stay denied even with both users active (negative)', async () => {
    const read = await fetch(`${baseUrl}/api/voice/preferences`)
    assert.equal(read.status, 401)
    const write = await fetch(`${baseUrl}/api/voice/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volume: 10 }),
    })
    assert.equal(write.status, 401)
  })
})