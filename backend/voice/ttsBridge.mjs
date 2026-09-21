import { spawn } from 'node:child_process'

/**
 * Supertonic helper process boundary (SW-REQ-013-02).
 *
 * The helper speaks one JSON document on stdout; this module enforces the
 * discipline: buffer caps, timeout with TERM→KILL escalation, JSON-only
 * stdout parsing (tracebacks on stdout are rejected, never trusted), and
 * probe-result caching (brief, never permanent). Spawning is injectable so
 * unit tests run without Python.
 */

export const TTS_BRIDGE_TIMEOUT_MS = 120000
export const TTS_BRIDGE_KILL_GRACE_MS = 5000
export const TTS_BRIDGE_MAX_STDOUT_BYTES = 1024 * 1024
export const TTS_BRIDGE_MAX_STDERR_BYTES = 256 * 1024
export const TTS_BRIDGE_PROBE_TTL_MS = 60000

const truncateTail = (text, maxChars = 500) =>
  text.length > maxChars ? `...${text.slice(-maxChars)}` : text

/**
 * Run the helper and parse its single stdout JSON document.
 * Never throws: every failure (spawn, timeout, cap, parse) is a typed result.
 * Never includes audio bytes or tracebacks in the returned error — the stderr
 * tail is diagnostics for server logs only via `diagnostic`.
 */
export const runTtsHelper = ({
  pythonBin = 'python3',
  helperPath,
  args = [],
  timeoutMs = TTS_BRIDGE_TIMEOUT_MS,
  killGraceMs = TTS_BRIDGE_KILL_GRACE_MS,
  maxStdoutBytes = TTS_BRIDGE_MAX_STDOUT_BYTES,
  maxStderrBytes = TTS_BRIDGE_MAX_STDERR_BYTES,
  spawnFn = spawn,
}) =>
  new Promise((resolve) => {
    let settled = false
    const finish = (result) => {
      if (!settled) {
        settled = true
        resolve(result)
      }
    }

    let child = null
    try {
      child = spawnFn(pythonBin, [helperPath, ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (error) {
      finish({ ok: false, code: 'spawn-failed', message: 'Speech helper could not start.', diagnostic: String(error?.message ?? error) })
      return
    }

    if (!child || !child.stdout || !child.stderr) {
      finish({ ok: false, code: 'spawn-failed', message: 'Speech helper could not start.', diagnostic: 'missing stdio pipes' })
      return
    }

    let stdoutBytes = 0
    let stderrBytes = 0
    let stdoutText = ''
    let stderrText = ''
    let capped = false

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString('utf8')
      stdoutBytes += Buffer.byteLength(text)
      if (stdoutBytes > maxStdoutBytes) {
        capped = true
        killChild(child)
        return
      }
      stdoutText += text
    })
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf8')
      stderrBytes += Buffer.byteLength(text)
      if (stderrBytes <= maxStderrBytes) {
        stderrText += text
      }
    })
    child.on('error', (error) => {
      finish({ ok: false, code: 'spawn-failed', message: 'Speech helper could not start.', diagnostic: String(error?.message ?? error) })
    })

    const timeoutId = setTimeout(() => {
      killChild(child)
      const killTimer = setTimeout(() => {
        try {
          child.kill('SIGKILL')
        } catch {
          // Already exited; nothing to escalate.
        }
      }, killGraceMs)
      killTimer.unref?.()
      finish({ ok: false, code: 'timeout', message: 'Speech synthesis timed out.', diagnostic: `exceeded ${timeoutMs}ms` })
    }, timeoutMs)

    child.on('close', (code) => {
      clearTimeout(timeoutId)
      if (settled) {
        return
      }
      if (capped) {
        finish({ ok: false, code: 'output-capped', message: 'Speech helper output exceeded the buffer cap.', diagnostic: `>${maxStdoutBytes}B stdout` })
        return
      }
      const document = stdoutText.trim()
      if (!document) {
        finish({ ok: false, code: 'empty-stdout', message: 'Speech helper produced no output.', diagnostic: truncateTail(stderrText) || `exit ${code}` })
        return
      }
      let payload = null
      try {
        payload = JSON.parse(document)
      } catch {
        finish({ ok: false, code: 'invalid-stdout', message: 'Speech helper output was not JSON.', diagnostic: truncateTail(`${document}\n${stderrText}`) })
        return
      }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        finish({ ok: false, code: 'invalid-stdout', message: 'Speech helper output was not a JSON object.', diagnostic: truncateTail(stderrText) })
        return
      }
      if (payload.ok === true) {
        finish({ ok: true, payload })
        return
      }
      finish({
        ok: false,
        code: typeof payload.error === 'string' && payload.error.length > 0 ? 'helper-error' : 'invalid-stdout',
        message: typeof payload.error === 'string' && payload.error.length > 0 ? payload.error : 'Speech helper reported an error.',
        diagnostic: truncateTail(stderrText),
      })
    })
  })

const killChild = (child) => {
  try {
    child.kill('SIGTERM')
  } catch {
    // Already exited; the SIGKILL escalation handles strays.
  }
}

const probeCache = { atMs: 0, result: null }

export const resetTtsProbeCacheForTests = () => {
  probeCache.atMs = 0
  probeCache.result = null
}

/** Readiness probe with brief TTL (failures are never cached permanently). */
export const probeTtsEngine = async ({
  pythonBin,
  helperPath,
  modelDir,
  ttlMs = TTS_BRIDGE_PROBE_TTL_MS,
  nowMs = Date.now(),
  runFn = runTtsHelper,
}) => {
  if (probeCache.result && nowMs - probeCache.atMs < ttlMs) {
    return probeCache.result
  }
  const args = ['--probe']
  if (modelDir) {
    args.push('--model-dir', modelDir)
  }
  const outcome = await runFn({ pythonBin, helperPath, args, timeoutMs: 30000 })
  const result =
    outcome.ok && outcome.payload?.ok === true
      ? {
          available:
            outcome.payload.import_ok === true &&
            outcome.payload.model_files_present === true &&
            Array.isArray(outcome.payload.voices) &&
            outcome.payload.voices.length > 0,
          sdkVersion: outcome.payload.sdk_version ?? null,
          voices: Array.isArray(outcome.payload.voices) ? outcome.payload.voices : [],
          modelDir: outcome.payload.model_dir ?? modelDir ?? null,
          missingFiles: Array.isArray(outcome.payload.missing_files) ? outcome.payload.missing_files : [],
          detail: null,
        }
      : {
          available: false,
          sdkVersion: null,
          voices: [],
          modelDir: modelDir ?? null,
          missingFiles: [],
          detail: outcome.message ?? 'Speech engine probe failed.',
        }
  probeCache.atMs = nowMs
  probeCache.result = result
  return result
}

/** Synthesize one utterance to an explicit output file. */
export const synthesizeSpeech = async ({
  pythonBin,
  helperPath,
  modelDir,
  offline = true,
  text,
  voice,
  lang,
  outputFile,
  steps = 8,
  timeoutMs = TTS_BRIDGE_TIMEOUT_MS,
  runFn = runTtsHelper,
}) => {
  const args = [
    '--text', text,
    '--voice', voice,
    '--lang', lang,
    '--output-file', outputFile,
    '--format', 'wav',
    '--steps', String(steps),
  ]
  if (modelDir) {
    args.push('--model-dir', modelDir)
  }
  if (offline) {
    args.push('--offline')
  }
  const outcome = await runFn({ pythonBin, helperPath, args, timeoutMs })
  if (!outcome.ok) {
    return outcome
  }
  if (!outcome.payload || outcome.payload.ok !== true || typeof outcome.payload.audio_path !== 'string') {
    return { ok: false, code: 'invalid-stdout', message: 'Speech helper reported success without audio.', diagnostic: '' }
  }
  return { ok: true, payload: outcome.payload }
}
