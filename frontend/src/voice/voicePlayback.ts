import { chunkForSpeech, stripMarkdownToSpeech } from './speechText.ts'
import type { VoiceSynthesisResult } from './tts.ts'
import { traceVoiceEvent } from './voiceTrace.ts'

/**
 * Autoplay/volume/replay playback controller (SW-REQ-013-02, SW-REQ-013-04
 * output half).
 *
 * Framework-free so the queue/interrupt/volume lifecycle is unit-testable
 * with fake players and fake synthesis (the TC-A pattern). The `<audio>`
 * element itself is created by an injected factory; an injected
 * `createOutputLevels` attaches a Web-Audio analyser so the output circle
 * and the UI read scalars only.
 *
 * Guards: `getPrefs()` (defaults until TC-B-03) decides whether enqueue
 * autoplays at all; `interrupt()` cancels the queue and stops the current
 * utterance on any tap/unmount.
 */

export interface VoicePlaybackPrefs {
  ttsEnabled: boolean
  voice: string
  volume: number
  speed: number
}

export interface PlayableAudio {
  play(): Promise<void> | void
  pause(): void
  volume: number
  onended: ((ev: Event) => void) | null
  src: string
  /**
   * Underlying media element (for analyser sources); optional in fakes.
   * NOTE: media duration is a read-only property of the media element and is
   * deliberately NOT part of this contract — assigning duration used to throw
   * `TypeError: Cannot set property duration … only a getter` on every replay
   * (fixed 2026-09-21, real-browser proof).
   */
  element?: HTMLAudioElement
}

export type AudioPlayerFactory = () => PlayableAudio

/** Scalar output levels for the circle (analyser-bound; never audio data). */
export interface OutputLevelSource {
  readonly sampler: () => number
  dispose(): void
}

export type OutputLevelsFactory = (player: PlayableAudio) => OutputLevelSource | null

export interface VoicePlaybackDeps {
  readonly synthesize?: (chunk: {
    text: string
    voice: string
    lang: string
    speed: number
  }) => Promise<VoiceSynthesisResult>
  readonly createPlayer?: AudioPlayerFactory
  readonly createOutputLevels?: OutputLevelsFactory
  readonly getPrefs?: () => VoicePlaybackPrefs
  readonly language?: () => string
  /** Fail-closed surface (SW-REQ-013-04): called with a stable error code when synthesis/playback fails. */
  readonly onError?: (code: string) => void
}

export interface VoicePlaybackSnapshot {
  readonly playing: boolean
  /** Message id currently speaking (null when idle). */
  readonly speakingMessageId: string | null
  readonly volume: number
  readonly outputLevel: number
}

const defaultPrefs = (): VoicePlaybackPrefs => ({
  ttsEnabled: true,
  voice: 'F1',
  volume: 80,
  speed: 1.2,
})

export class VoicePlaybackController {
  private deps: VoicePlaybackDeps
  private snapshot: VoicePlaybackSnapshot = {
    playing: false,
    speakingMessageId: null,
    volume: defaultPrefs().volume,
    outputLevel: 0,
  }
  private listeners = new Set<(snapshot: VoicePlaybackSnapshot) => void>()
  private queue: Array<{ messageId: string; chunks: string[] }> = []
  private runId = 0
  private player: PlayableAudio | null = null
  private outputLevels: OutputLevelSource | null = null

  constructor(deps: VoicePlaybackDeps = {}) {
    this.deps = deps
  }

  updateDeps(deps: VoicePlaybackDeps): void {
    this.deps = deps
  }

  getSnapshot(): VoicePlaybackSnapshot {
    return this.snapshot
  }

  subscribe(listener: (snapshot: VoicePlaybackSnapshot) => void): () => void {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  private setSnapshot(next: VoicePlaybackSnapshot): void {
    this.snapshot = next

    for (const listener of this.listeners) {
      listener(next)
    }
  }

  private prefs(): VoicePlaybackPrefs {
    return this.deps.getPrefs?.() ?? defaultPrefs()
  }

  private synthesize() {
    return (
      this.deps.synthesize ??
      (async () => {
        throw new Error('Synthesis not available in this context.')
      })
    )
  }

  private createPlayer(): PlayableAudio {
    return this.deps.createPlayer?.() ?? {
      play: async () => undefined,
      pause: () => undefined,
      volume: 1,
      onended: null,
      src: '',
    }
  }

  /**
   * Rebuild the message queue (strip + chunk) and start playing from the
   * beginning (fire-and-forget — autoplay never blocks the UI). No-op when
   * TTS is disabled or text is empty.
   */
  async enqueueMessage(messageId: string, markdownContent: string): Promise<void> {
    if (!this.prefs().ttsEnabled) {
      return
    }

    const speech = stripMarkdownToSpeech(markdownContent)
    const chunks = chunkForSpeech(speech)

    if (chunks.length === 0) {
      return
    }

    this.interrupt()

    this.queue = [{ messageId, chunks }]
    this.runId += 1
    const runId = this.runId
    void this.playQueue(runId)
  }

  /** Replay a previously synthesized/queued message (by id), or enqueue fresh. */
  async playMessage(messageId: string, markdownContent: string): Promise<void> {
    await this.enqueueMessage(messageId, markdownContent)
  }

  /** Stop everything immediately (mic tap, unmount, new enqueue). */
  interrupt(): void {
    this.runId += 1
    this.stopCurrentPlayer()
    this.queue = []
    this.setSnapshot({ ...this.snapshot, playing: false, speakingMessageId: null, outputLevel: 0 })
  }

  setVolume(volume: number): void {
    const clamped = Math.min(100, Math.max(0, volume))
    this.snapshot = { ...this.snapshot, volume: clamped }

    if (this.player) {
      this.player.volume = clamped / 100
    }

    this.setSnapshot(this.snapshot)
  }

  private stopCurrentPlayer(): void {
    this.player?.pause()
    this.player = null
    this.outputLevels?.dispose()
    this.outputLevels = null
  }

  private speakChunk(
    chunk: { text: string; voice: string; lang: string; speed: number },
    onEnd: () => void,
  ): void {
    const player = this.createPlayer()
    this.player = player
    player.volume = this.prefs().volume / 100

    this.outputLevels = this.deps.createOutputLevels?.(player) ?? null

    let ended = false
    player.onended = () => {
      if (!ended) {
        ended = true
        this.outputLevels?.dispose()
        this.outputLevels = null
        this.player = null
        onEnd()
      }
    }

    // Pipeline trace: character count only, never the spoken text.
    traceVoiceEvent(
      'tts-triggered',
      `chars=${chunk.text.length} voice=${chunk.voice} lang=${chunk.lang}`,
    )
    void this.synthesize()(chunk)
      .then((result) => {
        if (player !== this.player) {
          return
        }
        traceVoiceEvent('tts-received', `ms=${result.durationMs} cache=${result.cacheHit}`)
        player.src = result.audioDataUrl
        // play() rejects when the browser blocks it (autoplay policy on a
        // kiosk profile without accumulated engagement, muted tab, no audio
        // path). A floating rejection dies silently — handle it like a
        // synthesis failure (SW-REQ-013-04: never die quietly) so the
        // console names the cause (`[voice] playback blocked:`) instead.
        const playback = player.play()
        traceVoiceEvent('tts-play-start')
        if (playback && typeof playback.catch === 'function') {
          playback.catch((reason: unknown) => {
            if (player !== this.player) {
              return
            }
            if (typeof console !== 'undefined') {
              console.warn('[voice] playback blocked:', reason)
            }
            this.deps.onError?.('tts-unavailable')
            this.outputLevels?.dispose()
            this.outputLevels = null
            this.player = null
            onEnd()
          })
        }
      })
      .catch((reason: unknown) => {
        if (player !== this.player) {
          return
        }
        // Fail closed with user-facing copy instead of a silent flicker
        // (SW-REQ-013-04): the replay button must never die quietly.
        if (typeof console !== 'undefined') {
          console.warn('[voice] playback failed:', reason)
        }
        this.deps.onError?.('tts-unavailable')
        this.outputLevels?.dispose()
        this.outputLevels = null
        this.player = null
        onEnd()
      })
  }

  private async playQueue(runId: number): Promise<void> {
    this.setSnapshot({ ...this.snapshot, playing: true, speakingMessageId: null, outputLevel: 0 })

    const entry = this.queue[0]

    if (!entry) {
      this.setSnapshot({ ...this.snapshot, playing: false })
      return
    }

    this.setSnapshot({ ...this.snapshot, speakingMessageId: entry.messageId })
    const prefs = this.prefs()
    const lang = this.deps.language?.() ?? 'en'

    for (const chunk of entry.chunks) {
      if (runId !== this.runId) {
        return
      }

      await new Promise<void>((resolveEnd) => {
        this.speakChunk({ text: chunk, voice: prefs.voice, lang, speed: prefs.speed }, resolveEnd)
      })
    }

    if (runId !== this.runId) {
      return
    }

    this.setSnapshot({ ...this.snapshot, playing: false, speakingMessageId: null, outputLevel: 0 })
  }

  /** Poll for the current output level (called by the circle's animation loop). */
  readOutputLevel(): number {
    const level = this.outputLevels?.sampler() ?? 0
    this.snapshot = { ...this.snapshot, outputLevel: level }
    return level
  }
}