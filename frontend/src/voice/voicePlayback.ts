import { chunkForSpeech, stripMarkdownToSpeech } from './speechText.ts'
import type { VoiceSynthesisResult } from './tts.ts'

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
}

export interface PlayableAudio {
  play(): Promise<void> | void
  pause(): void
  volume: number
  onended: ((ev: Event) => void) | null
  src: string
  duration: number
  /** Underlying media element (for analyser sources); optional in fakes. */
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
  readonly synthesize?: (chunk: { text: string; voice: string; lang: string }) => Promise<VoiceSynthesisResult>
  readonly createPlayer?: AudioPlayerFactory
  readonly createOutputLevels?: OutputLevelsFactory
  readonly getPrefs?: () => VoicePlaybackPrefs
  readonly language?: () => string
  readonly onError?: (message: string) => void
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
      duration: 0,
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

  private speakChunk(chunk: { text: string; voice: string; lang: string }, onEnd: () => void): void {
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

    void this.synthesize()(chunk)
      .then((result) => {
        if (player !== this.player) {
          return
        }
        player.src = result.audioDataUrl
        player.duration = result.durationMs
        void player.play()
      })
      .catch(() => {
        if (player !== this.player) {
          return
        }
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
        this.speakChunk({ text: chunk, voice: prefs.voice, lang }, resolveEnd)
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