import { useEffect, useState } from 'react'
import type { PlayableAudio } from './voicePlayback.ts'
import {
  VoicePlaybackController,
  type VoicePlaybackDeps,
  type VoicePlaybackSnapshot,
} from './voicePlayback.ts'

const idleSnapshot: VoicePlaybackSnapshot = {
  playing: false,
  speakingMessageId: null,
  volume: 80,
  outputLevel: 0,
};

/**
 * React binding for the playback controller. Same pattern as
 * `useVoiceCapture` (TC-A): framework-free controller + thin hook.
 * Unmount interrupts playback (kiosk never leaks audio).
 */
export function useVoicePlayback(deps: VoicePlaybackDeps): {
  readonly snapshot: VoicePlaybackSnapshot
  readonly enqueueMessage: (messageId: string, content: string) => Promise<void>
  readonly playMessage: (messageId: string, content: string) => Promise<void>
  readonly interrupt: () => void
  readonly setVolume: (volume: number) => void
  readonly readOutputLevel: () => number
} {
  const [controller] = useState(() => new VoicePlaybackController(deps))
  const [snapshot, setSnapshot] = useState<VoicePlaybackSnapshot>(idleSnapshot)

  useEffect(() => {
    controller.updateDeps(deps)
  })

  useEffect(() => controller.subscribe(setSnapshot), [controller])

  useEffect(
    () => () => {
      controller.interrupt()
    },
    [controller],
  )

  return {
    snapshot,
    enqueueMessage: (messageId: string, content: string) =>
      controller.enqueueMessage(messageId, content),
    playMessage: (messageId: string, content: string) =>
      controller.playMessage(messageId, content),
    interrupt: () => controller.interrupt(),
    setVolume: (volume: number) => controller.setVolume(volume),
    readOutputLevel: () => controller.readOutputLevel(),
  }
}

export type { PlayableAudio, VoicePlaybackDeps, VoicePlaybackSnapshot }