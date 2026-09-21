type FetchApi = (
  path: string,
  init?: RequestInit,
) => Promise<Response>

/** Dynamic so pure codec functions import without the Vite runtime. */
const loadFetchApi = async (): Promise<FetchApi> => {
  const request = (await import('../api/request.ts')) as unknown as {
    fetchApi: FetchApi
  }

  return request.fetchApi
}

/**
 * Local TTS client: backend synthesis + WAV→MP3 (SW-REQ-013-02).
 *
 * Contract: `synthesizeVoice` returns playable MP3 (`data:audio/mpeg`) plus
 * `durationMs`, synthesized by the backend Supertonic bridge and encoded
 * here with pure-JS lamejs (no ffmpeg, no native codecs). The backend owns
 * disk caching; this module is stateless.
 *
 * Why frontend-side MP3 (tech doc §3): raw 44.1 kHz WAV is ~10× larger than
 * needed for speech; encoding at the playback edge keeps the backend free of
 * codec dependencies. Network (`../api/request`, Vite `import.meta.env`) and
 * lamejs load dynamically, so the pure codec functions import cleanly in any
 * runtime (including Node unit tests).
 */

export interface VoiceTtsStatus {
  readonly available: boolean
  readonly sdkVersion: string | null
  readonly voices: readonly string[]
  readonly modelDirConfigured: boolean
  readonly detail: string | null
}

export interface VoiceSynthesisResult {
  /** `data:audio/mpeg;base64,…` — ready for `<audio>` or WebAudio. */
  readonly audioDataUrl: string
  readonly durationMs: number
  readonly voice: string
  readonly language: string
  readonly cacheHit: boolean
}

export class VoiceTtsError extends Error {
  readonly code:
    | 'unavailable'
    | 'invalid-input'
    | 'unsupported-format'
    | 'encode-failed'
    | 'request-failed'

  constructor(
    code: VoiceTtsError['code'],
    message: string,
  ) {
    super(message)
    this.name = 'VoiceTtsError'
    this.code = code
  }
}

interface VoiceStatusPayload {
  voice?: {
    available?: unknown
    sdkVersion?: unknown
    voices?: unknown
    modelDirConfigured?: unknown
    detail?: unknown
  }
}

interface VoiceSynthesizePayload {
  voice?: {
    audioBase64?: unknown
    mimeType?: unknown
    voice?: unknown
    language?: unknown
    cacheHit?: unknown
  }
  error?: unknown
  errorCode?: unknown
}

const VOICE_TTS_MP3_KBPS = 64
const VOICE_TTS_MP3_FRAME_SAMPLES = 1152

export const getVoiceStatus = async (): Promise<VoiceTtsStatus> => {
  const fetchApi = await loadFetchApi()
  const response = await fetchApi('/voice/status')

  if (!response.ok) {
    throw new VoiceTtsError('request-failed', 'Voice status check failed.')
  }

  const payload = (await response.json()) as VoiceStatusPayload
  const voice = payload.voice ?? {}

  return {
    available: voice.available === true,
    sdkVersion: typeof voice.sdkVersion === 'string' ? voice.sdkVersion : null,
    voices: Array.isArray(voice.voices)
      ? voice.voices.filter(
          (entry): entry is string => typeof entry === 'string',
        )
      : [],
    modelDirConfigured: voice.modelDirConfigured === true,
    detail: typeof voice.detail === 'string' ? voice.detail : null,
  }
}

const decodeBase64ToBytes = (base64: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

const readAscii = (view: DataView, offset: number, length: number): string => {
  let text = ''

  for (let index = 0; index < length; index += 1) {
    text += String.fromCharCode(view.getUint8(offset + index))
  }

  return text
}

/**
 * Parse a WAV buffer (RIFF/`fmt `/`data`; PCM 8/16/24/32-bit int and 32-bit
 * float; mono or stereo → mono average). Never labels non-WAV bytes as audio:
 * anything else throws `unsupported-format`.
 */
export const parseWavSamples = (
  buffer: ArrayBuffer,
): { samples: Float32Array<ArrayBuffer>; sampleRate: number } => {
  if (buffer.byteLength < 44) {
    throw new VoiceTtsError('unsupported-format', 'Audio is not a WAV file.')
  }

  const view = new DataView(buffer)

  if (readAscii(view, 0, 4) !== 'RIFF' || readAscii(view, 8, 4) !== 'WAVE') {
    throw new VoiceTtsError('unsupported-format', 'Audio is not a WAV file.')
  }

  let cursor = 12
  let audioFormat = 1
  let channels = 1
  let sampleRate = 44100
  let bitsPerSample = 16
  let dataOffset = -1
  let dataLength = 0

  while (cursor + 8 <= buffer.byteLength) {
    const chunkId = readAscii(view, cursor, 4)
    const chunkSize = view.getUint32(cursor + 4, true)
    const bodyOffset = cursor + 8

    if (chunkId === 'fmt ' && bodyOffset + 16 <= buffer.byteLength) {
      audioFormat = view.getUint16(bodyOffset, true)
      channels = view.getUint16(bodyOffset + 2, true)
      sampleRate = view.getUint32(bodyOffset + 4, true)
      bitsPerSample = view.getUint16(bodyOffset + 14, true)
    } else if (chunkId === 'data') {
      dataOffset = bodyOffset
      dataLength = Math.min(chunkSize, buffer.byteLength - bodyOffset)
    }

    cursor = bodyOffset + chunkSize + (chunkSize % 2)
  }

  if (dataOffset < 0 || sampleRate <= 0 || channels < 1) {
    throw new VoiceTtsError('unsupported-format', 'WAV headers are incomplete.')
  }

  if (audioFormat !== 1 && audioFormat !== 3) {
    throw new VoiceTtsError(
      'unsupported-format',
      'Only PCM and float WAV audio is supported.',
    )
  }

  if (![8, 16, 24, 32].includes(bitsPerSample)) {
    throw new VoiceTtsError('unsupported-format', 'Unsupported WAV bit depth.')
  }

  const bytesPerSample = bitsPerSample / 8
  const frameCount = Math.floor(dataLength / (bytesPerSample * channels))

  if (frameCount === 0) {
    throw new VoiceTtsError('unsupported-format', 'WAV audio is empty.')
  }

  const mono = new Float32Array(frameCount)

  for (let frame = 0; frame < frameCount; frame += 1) {
    let mixed = 0

    for (let channel = 0; channel < channels; channel += 1) {
      const offset = dataOffset + (frame * channels + channel) * bytesPerSample
      let sample: number

      if (audioFormat === 3 && bitsPerSample === 32) {
        sample = view.getFloat32(offset, true)
      } else if (bitsPerSample === 8) {
        sample = (view.getUint8(offset) - 128) / 128
      } else if (bitsPerSample === 16) {
        sample = view.getInt16(offset, true) / 32768
      } else if (bitsPerSample === 24) {
        const raw =
          view.getUint8(offset) |
          (view.getUint8(offset + 1) << 8) |
          (view.getUint8(offset + 2) << 16)
        sample = (raw >= 0x800000 ? raw - 0x1000000 : raw) / 8388608
      } else {
        sample = view.getInt32(offset, true) / 2147483648
      }

      mixed += sample
    }

    mono[frame] = mixed / channels
  }

  return { samples: mono, sampleRate }
}

const int16FromFloat = (samples: Float32Array<ArrayBufferLike>): Int16Array => {
  const output = new Int16Array(samples.length)

  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.min(1, Math.max(-1, samples[index] ?? 0))
    output[index] = Math.round(clamped * 32767)
  }

  return output
}

/**
 * Encode mono float PCM to MP3 (`data:audio/mpeg`) at 64 kbps. Pure-JS lamejs
 * in 1152-sample frames + `flush()` (tech doc §3).
 */
export const encodeMp3DataUrl = async (
  samples: Float32Array<ArrayBufferLike>,
  sampleRate: number,
): Promise<{ audioDataUrl: string; durationMs: number }> => {
  if (samples.length === 0 || sampleRate <= 0) {
    throw new VoiceTtsError('encode-failed', 'Nothing to encode.')
  }

  let encoder: {
    encodeBuffer: (left: Int16Array) => Uint8Array
    flush: () => Uint8Array
  }

  try {
    const lamejs = (await import('@breezystack/lamejs')) as unknown as {
      Mp3Encoder: new (
        channels: number,
        sampleRate: number,
        kbps: number,
      ) => {
        encodeBuffer: (left: Int16Array) => Uint8Array
        flush: () => Uint8Array
      }
    }
    encoder = new lamejs.Mp3Encoder(1, sampleRate, VOICE_TTS_MP3_KBPS)
  } catch {
    throw new VoiceTtsError('encode-failed', 'MP3 encoder failed to load.')
  }

  const pcm16 = int16FromFloat(samples)
  const chunks: Uint8Array[] = []
  let encodedBytes = 0

  try {
    for (
      let offset = 0;
      offset < pcm16.length;
      offset += VOICE_TTS_MP3_FRAME_SAMPLES
    ) {
      const frame = encoder.encodeBuffer(
        pcm16.subarray(offset, offset + VOICE_TTS_MP3_FRAME_SAMPLES),
      )

      if (frame.length > 0) {
        chunks.push(frame)
        encodedBytes += frame.length
      }
    }

    const tail = encoder.flush()

    if (tail.length > 0) {
      chunks.push(tail)
      encodedBytes += tail.length
    }
  } catch {
    throw new VoiceTtsError('encode-failed', 'MP3 encoding failed.')
  }

  if (encodedBytes === 0) {
    throw new VoiceTtsError('encode-failed', 'MP3 encoding produced no audio.')
  }

  const merged = new Uint8Array(encodedBytes)
  let cursor = 0

  for (const chunk of chunks) {
    merged.set(chunk, cursor)
    cursor += chunk.length
  }

  let binary = ''

  for (const byte of merged) {
    binary += String.fromCharCode(byte)
  }

  return {
    audioDataUrl: `data:audio/mpeg;base64,${btoa(binary)}`,
    durationMs: Math.round((samples.length / sampleRate) * 1000),
  }
}

/**
 * Full client path: synthesize via the backend bridge, parse the WAV, encode
 * MP3. Throws `VoiceTtsError` (`unavailable` when the engine is down).
 */
export const synthesizeVoice = async ({
  text,
  voice,
  lang,
}: {
  text: string
  voice: string
  lang: string
}): Promise<VoiceSynthesisResult> => {
  const trimmed = text.trim()

  if (!trimmed) {
    throw new VoiceTtsError('invalid-input', 'Nothing to synthesize.')
  }

  const fetchApi = await loadFetchApi()
  const response = await fetchApi('/voice/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: trimmed, voice, lang }),
  })

  if (response.status === 401) {
    throw new VoiceTtsError('unavailable', 'Authentication required.')
  }

  if (response.status === 503 || response.status === 504) {
    throw new VoiceTtsError(
      'unavailable',
      'Speech engine is unavailable (reinstall / repair runtime).',
    )
  }

  if (!response.ok) {
    throw new VoiceTtsError('request-failed', 'Speech synthesis failed.')
  }

  const payload = (await response.json()) as VoiceSynthesizePayload
  const result = payload.voice

  if (
    typeof result?.audioBase64 !== 'string' ||
    result.audioBase64.length === 0 ||
    typeof result.voice !== 'string' ||
    typeof result.language !== 'string'
  ) {
    throw new VoiceTtsError('request-failed', 'Speech synthesis failed.')
  }

  const wavBytes = decodeBase64ToBytes(result.audioBase64)
  const { samples, sampleRate } = parseWavSamples(
    wavBytes.buffer as ArrayBuffer,
  )
  const { audioDataUrl, durationMs } = await encodeMp3DataUrl(
    samples,
    sampleRate,
  )

  return {
    audioDataUrl,
    durationMs,
    voice: result.voice,
    language: result.language,
    cacheHit: result.cacheHit === true,
  }
}
