import { useEffect, useRef, useState } from 'react'
import {
  createLevelMonitor,
  type LevelSampler,
} from './audioLevel.ts'

/**
 * React binding for the framework-free level monitor.
 *
 * Contract: returns a scalar amplitude in [0, 1] at `intervalMs`; emits 0
 * while inactive. Audio buffers never enter React state.
 *
 * Why (SW-REQ-013-04 input half): the pulsating input circle renders from
 * this value; the hook owns monitor lifecycle (start on active, stop + reset
 * on inactive/unmount) so the mic analyser cannot leak.
 */
export function useAudioLevel(
  sampler: LevelSampler | null,
  active: boolean,
  intervalMs: number = 50,
): number {
  const [level, setLevel] = useState(0)
  const samplerRef = useRef<LevelSampler | null>(sampler)

  useEffect(() => {
    samplerRef.current = sampler
  }, [sampler])

  useEffect(() => {
    if (!active || samplerRef.current === null) {
      setLevel(0)
      return
    }

    const monitor = createLevelMonitor(
      {
        sample: () => samplerRef.current?.sample() ?? 0,
      },
      { intervalMs, onLevel: setLevel },
    )

    monitor.start()

    return () => {
      monitor.stop()
    }
  }, [active, intervalMs])

  return level
}
