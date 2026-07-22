const UI_CLICK_SOUND_PEAK_GAIN = 0.056

let audioContext: AudioContext | null = null

type AudioContextConstructor = typeof AudioContext

const resolveAudioContextConstructor = (): AudioContextConstructor | null => {
  const browserWindow = window as typeof window & {
    webkitAudioContext?: AudioContextConstructor
  }

  return browserWindow.AudioContext ?? browserWindow.webkitAudioContext ?? null
}

const ensureAudioContextReady = () => {
  const AudioContextCtor = resolveAudioContextConstructor()

  if (!AudioContextCtor) {
    return null
  }

  const nextAudioContext = audioContext ?? new AudioContextCtor()
  audioContext = nextAudioContext

  if (nextAudioContext.state === 'suspended') {
    void nextAudioContext.resume().catch(() => {})
  }

  return nextAudioContext
}

export const UI_CLICK_SOUND_SELECTOR = [
  'button:not(:disabled)',
  '[role="button"]:not([aria-disabled="true"])',
  'a[href]',
  'summary',
].join(', ')

export const isUiClickSoundTarget = (value: EventTarget | null) => {
  if (!(value instanceof Element)) return false
  return value.closest(UI_CLICK_SOUND_SELECTOR) !== null
}

export const playUiClickSound = () => {
  const nextAudioContext = ensureAudioContextReady()

  if (!nextAudioContext) {
    return
  }

  const oscillator = nextAudioContext.createOscillator()
  const gain = nextAudioContext.createGain()
  const startTime = nextAudioContext.currentTime

  oscillator.type = 'square'
  oscillator.frequency.setValueAtTime(720, startTime)
  gain.gain.setValueAtTime(0.001, startTime)
  gain.gain.linearRampToValueAtTime(UI_CLICK_SOUND_PEAK_GAIN, startTime + 0.003)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.045)

  oscillator.connect(gain)
  gain.connect(nextAudioContext.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + 0.05)
}