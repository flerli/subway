import { sampleRmsFromTimeDomain } from './audioLevel.ts'
import type { OutputLevelSource, PlayableAudio } from './voicePlayback.ts'

/**
 * Output-level analyser for the playback circle (SW-REQ-013-04 output half).
 *
 * Attaches a Web-Audio `MediaElementSource` to the playing `<audio>` element
 * and exposes scalar RMS at ~20 Hz. Returns `null` when Web Audio or the
 * element is unusable — the circle then stays quiet instead of crashing.
 * Dispose tears down the graph (interrupt/unmount never leak audio).
 */
export const createPlaybackLevelSource = (
  player: PlayableAudio,
): OutputLevelSource | null => {
  const element = player.element

  if (!element) {
    return null
  }

  try {
    if (
      typeof window === 'undefined' ||
      typeof window.AudioContext !== 'function'
    ) {
      return null
    }

    const context = new window.AudioContext()
    const source = context.createMediaElementSource(element)
    const analyser = context.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    // CRITICAL: attaching a MediaElementSource ROUTES the element's output
    // through this graph — without a destination the audio is silently muted
    // ("streaming but no sound"). Always terminate the chain at the speakers.
    analyser.connect(context.destination)

    if (context.state === 'suspended') {
      void context.resume().catch(() => undefined)
    }

    return {
      sampler: () =>
        sampleRmsFromTimeDomain(
          (target) => analyser.getByteTimeDomainData(target),
          analyser.fftSize,
        ),
      dispose: (): void => {
        try {
          source.disconnect()
        } catch {
          // Teardown must never throw into the playback controller.
        }

        void context.close().catch(() => undefined)
      },
    }
  } catch {
    return null
  }
}