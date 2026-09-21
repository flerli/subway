import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import {
  probeTtsEngine,
  resetTtsProbeCacheForTests,
  runTtsHelper,
  synthesizeSpeech,
} from '../ttsBridge.mjs'

/** Deterministic fake for node:child_process spawn. */
const fakeSpawn = ({ stdout = '', stderr = '', exitCode = 0, neverClose = false, onKill = null } = {}) => {
  const child = new EventEmitter()
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.kill = (signal) => {
    onKill?.(signal)
    return true
  }
  child.captured = { stdout, stderr, exitCode, neverClose }
  queueMicrotask(() => {
    if (!neverClose) {
      if (stdout) {
        child.stdout.emit('data', Buffer.from(stdout))
      }
      if (stderr) {
        child.stderr.emit('data', Buffer.from(stderr))
      }
      child.emit('close', exitCode)
    }
  })
  const spawnFn = () => child
  return { child, spawnFn }
}

beforeEach(() => {
  resetTtsProbeCacheForTests()
})

describe('runTtsHelper', () => {
  it('parses the single stdout JSON document (positive)', async () => {
    const { spawnFn } = fakeSpawn({ stdout: '{"ok": true, "audio_path": "/tmp/x.wav"}\n' })
    const outcome = await runTtsHelper({ helperPath: '/h.py', args: [], spawnFn })
    assert.equal(outcome.ok, true)
    assert.equal(outcome.payload.audio_path, '/tmp/x.wav')
  })

  it('maps helper-error JSON to helper-error (negative)', async () => {
    const { spawnFn } = fakeSpawn({ stdout: '{"ok": false, "error": "Nope."}', exitCode: 1 })
    const outcome = await runTtsHelper({ helperPath: '/h.py', args: [], spawnFn })
    assert.equal(outcome.ok, false)
    assert.equal(outcome.code, 'helper-error')
    assert.equal(outcome.message, 'Nope.')
  })

  it('rejects traceback-polluted stdout (negative: stdout purity)', async () => {
    const { spawnFn } = fakeSpawn({ stdout: 'Traceback (most recent call last):\n  File "x"\n{"ok": true}', exitCode: 1 })
    const outcome = await runTtsHelper({ helperPath: '/h.py', args: [], spawnFn })
    assert.equal(outcome.ok, false)
    assert.equal(outcome.code, 'invalid-stdout')
  })

  it('fails closed on empty stdout (negative)', async () => {
    const { spawnFn } = fakeSpawn({ stdout: '', stderr: 'boom', exitCode: 2 })
    const outcome = await runTtsHelper({ helperPath: '/h.py', args: [], spawnFn })
    assert.equal(outcome.ok, false)
    assert.equal(outcome.code, 'empty-stdout')
  })

  it('enforces the timeout with TERM escalation (negative)', async () => {
    const signals = []
    const { spawnFn } = fakeSpawn({ neverClose: true, onKill: (signal) => signals.push(signal) })
    const outcome = await runTtsHelper({ helperPath: '/h.py', args: [], timeoutMs: 50, killGraceMs: 10000, spawnFn })
    assert.equal(outcome.ok, false)
    assert.equal(outcome.code, 'timeout')
    assert.deepEqual(signals, ['SIGTERM'])
  })

  it('enforces the stdout buffer cap (negative)', async () => {
    const { spawnFn } = fakeSpawn({ stdout: `{"ok": true, "pad": "${'x'.repeat(1000)}"}`, exitCode: 0 })
    const outcome = await runTtsHelper({ helperPath: '/h.py', args: [], maxStdoutBytes: 10, spawnFn })
    assert.equal(outcome.ok, false)
    assert.equal(outcome.code, 'output-capped')
  })

  it('reports spawn failures without throwing (negative)', async () => {
    const outcome = await runTtsHelper({
      helperPath: '/h.py',
      args: [],
      spawnFn: () => {
        throw new Error('ENOENT')
      },
    })
    assert.equal(outcome.ok, false)
    assert.equal(outcome.code, 'spawn-failed')
  })
})

describe('probeTtsEngine', () => {
  it('maps a healthy probe to available (positive)', async () => {
    const probe = await probeTtsEngine({
      helperPath: '/h.py',
      runFn: async () => ({
        ok: true,
        payload: { ok: true, import_ok: true, model_files_present: true, sdk_version: '1.3.1', voices: ['M1'], model_dir: '/m', missing_files: [] },
      }),
    })
    assert.equal(probe.available, true)
    assert.deepEqual(probe.voices, ['M1'])
  })

  it('reports missing models as unavailable, truthfully (negative)', async () => {
    const probe = await probeTtsEngine({
      helperPath: '/h.py',
      runFn: async () => ({
        ok: true,
        payload: { ok: true, import_ok: true, model_files_present: false, sdk_version: '1.3.1', voices: [], model_dir: '/m', missing_files: ['onnx/x.onnx'] },
      }),
    })
    assert.equal(probe.available, false)
    assert.deepEqual(probe.missingFiles, ['onnx/x.onnx'])
  })

  it('caches briefly but never permanently (positive)', async () => {
    let calls = 0
    const runFn = async () => {
      calls += 1
      return { ok: true, payload: { ok: true, import_ok: true, model_files_present: true, sdk_version: '1.3.1', voices: ['M1'], model_dir: '/m', missing_files: [] } }
    }
    await probeTtsEngine({ helperPath: '/h.py', runFn, nowMs: 1000 })
    await probeTtsEngine({ helperPath: '/h.py', runFn, nowMs: 2000 })
    assert.equal(calls, 1)
    await probeTtsEngine({ helperPath: '/h.py', runFn, nowMs: 1000 + 61000 })
    assert.equal(calls, 2)
  })
})

describe('synthesizeSpeech', () => {
  it('passes the offline contract args and returns audio (positive)', async () => {
    let seen = null
    const outcome = await synthesizeSpeech({
      helperPath: '/h.py',
      text: 'Hallo',
      voice: 'F2',
      lang: 'de',
      outputFile: '/tmp/out.wav',
      runFn: async (invocation) => {
        seen = invocation
        return { ok: true, payload: { ok: true, audio_path: '/tmp/out.wav' } }
      },
    })
    assert.equal(outcome.ok, true)
    assert.ok(seen.args.includes('--offline'))
    assert.ok(seen.args.includes('--text'))
    assert.ok(seen.args.includes('--output-file'))
    assert.ok(!seen.args.includes('--model-dir'))
  })

  it('rejects success-without-audio (negative)', async () => {
    const outcome = await synthesizeSpeech({
      helperPath: '/h.py',
      text: 'Hallo',
      voice: 'M1',
      lang: 'en',
      outputFile: '/tmp/out.wav',
      runFn: async () => ({ ok: true, payload: { ok: true } }),
    })
    assert.equal(outcome.ok, false)
    assert.equal(outcome.code, 'invalid-stdout')
  })
})
