import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Voice route auth gate tests (TC-B-01): the real server must deny
 * unauthenticated voice traffic. Authenticated per-user flows (isolation,
 * cacheHit) run in the manual smoke below and move to fixtures in TC-B-03.
 */

const here = dirname(fileURLToPath(import.meta.url))
const backendDir = join(here, '..', '..')
const TEST_PORT = 18787
const baseUrl = `http://127.0.0.1:${TEST_PORT}`

let server = null

const waitForBoot = async (deadlineMs = 15000) => {
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
  throw new Error('Voice test server did not boot in time.')
}

before(async () => {
  server = spawn('node', ['server.mjs'], {
    cwd: backendDir,
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdio: 'ignore',
  })
  await waitForBoot()
})

after(() => {
  try {
    server?.kill('SIGTERM')
  } catch {
    // Best effort teardown.
  }
})

describe('voice route auth', () => {
  it('denies unauthenticated status probes (negative)', async () => {
    const response = await fetch(`${baseUrl}/api/voice/status`)
    assert.equal(response.status, 401)
    const payload = await response.json()
    assert.equal(payload.error, 'Authentication required.')
  })

  it('denies unauthenticated synthesis (negative)', async () => {
    const response = await fetch(`${baseUrl}/api/voice/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hallo', voice: 'M1', lang: 'de' }),
    })
    assert.equal(response.status, 401)
    const payload = await response.json()
    assert.equal(payload.error, 'Authentication required.')
  })
})
