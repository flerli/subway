import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Real-helper contract tests (TC-B-01): stdout purity, error shapes, and —
 * when model weights are present — one genuine synthesis. Model-dependent
 * cases record SKIP with reason instead of failing (CI without weights).
 */

const here = dirname(fileURLToPath(import.meta.url))
const helperPath = join(here, '..', '..', 'tts_helper', 'tts_helper.py')
const pythonBin = process.env.TTS_TEST_PYTHON_BIN ?? 'python3'
const modelDir = process.env.TTS_TEST_MODEL_DIR ?? join(process.env.HOME ?? tmpdir(), '.cache', 'supertonic3')

const runHelper = (args, timeoutMs = 120000) => {
  const result = spawnSync(pythonBin, [helperPath, ...args], {
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024,
  })
  return {
    exit: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

const probeAvailable = () => {
  try {
    const run = runHelper(['--probe', '--model-dir', modelDir], 60000)
    const payload = JSON.parse(run.stdout)
    return payload.ok === true && payload.import_ok === true && payload.model_files_present === true
  } catch {
    return false
  }
}

describe('tts_helper contract', () => {
  it('emits exactly one stdout JSON document on probe (positive)', () => {
    const run = runHelper(['--probe', '--model-dir', modelDir], 60000)
    assert.equal(run.exit, 0)
    // Throws when stdout carries anything but the single document (purity proof).
    const payload = JSON.parse(run.stdout)
    assert.equal(payload.ok, true)
    assert.equal(typeof payload.import_ok, 'boolean')
    assert.ok(Array.isArray(payload.voices))
  })

  it('rejects unknown voices as JSON with nonzero exit (negative)', () => {
    const run = runHelper(
      ['--text', 'Hallo', '--voice', 'Z9', '--lang', 'de', '--output-file', join(tmpdir(), 'voice-nope.wav'), '--offline'],
      60000,
    )
    assert.notEqual(run.exit, 0)
    const payload = JSON.parse(run.stdout)
    assert.equal(payload.ok, false)
    assert.ok(typeof payload.error === 'string' && payload.error.length > 0)
  })

  it('fails missing output file as JSON with nonzero exit (negative)', () => {
    const run = runHelper(['--text', 'Hallo', '--voice', 'M1', '--lang', 'de'], 60000)
    assert.notEqual(run.exit, 0)
    const payload = JSON.parse(run.stdout)
    assert.equal(payload.ok, false)
  })

  it('synthesizes real audio when weights are present (positive, conditional)', () => {
    if (!probeAvailable()) {
      console.log('GATE SKIPPED: supertonic weights absent — set TTS_TEST_MODEL_DIR to a staged model dir.')
      return
    }
    const outputFile = join(tmpdir(), `voice-helper-synth-${Date.now()}.wav`)
    try {
      const run = runHelper(
        ['--text', 'Guten Morgen.', '--voice', 'M1', '--lang', 'de', '--output-file', outputFile, '--model-dir', modelDir, '--offline', '--steps', '8'],
        180000,
      )
      assert.equal(run.exit, 0)
      const payload = JSON.parse(run.stdout)
      assert.equal(payload.ok, true)
      assert.equal(payload.mime_type, 'audio/wav')
      assert.ok(payload.duration_seconds > 0)
      assert.ok(existsSync(outputFile))
      const header = readFileSync(outputFile).subarray(0, 4).toString('ascii')
      assert.equal(header, 'RIFF')
    } finally {
      try {
        unlinkSync(outputFile)
      } catch {
        // Best effort cleanup.
      }
    }
  })

  it('reports missing models as JSON, never a traceback on stdout (negative)', () => {
    const outputFile = join(tmpdir(), `voice-helper-missing-${Date.now()}.wav`)
    const run = runHelper(
      ['--text', 'Hallo', '--voice', 'M1', '--lang', 'de', '--output-file', outputFile, '--model-dir', join(tmpdir(), 'voice-no-model-here'), '--offline'],
      120000,
    )
    assert.notEqual(run.exit, 0)
    const payload = JSON.parse(run.stdout)
    assert.equal(payload.ok, false)
    assert.ok(!run.stdout.includes('Traceback'))
    try {
      unlinkSync(outputFile)
    } catch {
      // May not exist; best effort.
    }
  })
})
