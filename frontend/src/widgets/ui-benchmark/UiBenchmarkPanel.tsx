import { useMemo, useState } from 'react'
import type { UiBenchmarkWidgetTranslation } from './translations'

interface UiBenchmarkPanelProps {
  mode: 'grid' | 'expanded'
  widgetText: UiBenchmarkWidgetTranslation
}

interface BenchmarkResult {
  latencyMs: number
  smoothnessScore: number
  runCount: number
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const runCpuWork = (iterations: number, heavyPaintEnabled: boolean) => {
  let accumulator = 0

  for (let index = 0; index < iterations; index += 1) {
    accumulator += Math.sqrt(((index % 113) + accumulator) % 97)
  }

  if (heavyPaintEnabled) {
    const scratch = Array.from({ length: 280 }, (_, index) => {
      const value = Math.sin(index + accumulator) * Math.cos(index / 7)
      return Math.abs(value)
    })

    scratch.sort((left, right) => right - left)
    accumulator += scratch[0] ?? 0
  }

  return accumulator
}

export function UiBenchmarkPanel({ mode, widgetText }: UiBenchmarkPanelProps) {
  const [loadTarget, setLoadTarget] = useState(50)
  const [animationsEnabled, setAnimationsEnabled] = useState(true)
  const [heavyPaintEnabled, setHeavyPaintEnabled] = useState(false)
  const [liveLoopEnabled, setLiveLoopEnabled] = useState(false)
  const [colorReactionMs, setColorReactionMs] = useState<number | null>(null)
  const [colorInteractionCount, setColorInteractionCount] = useState(0)
  const [reactionPanelColor, setReactionPanelColor] = useState('#2850ad')
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<BenchmarkResult | null>(null)

  const motionClassName = animationsEnabled ? ' benchmark-probe--animated' : ''
  const loadSummary = `${loadTarget}%`

  const handleRunBenchmark = () => {
    if (isRunning) {
      return
    }

    setIsRunning(true)

    const startedAt = performance.now()

    window.requestAnimationFrame(() => {
      const modeMultiplier = mode === 'expanded' ? 1.5 : 1
      const loadMultiplier = loadTarget / 50
      const loopMultiplier = liveLoopEnabled ? 1.35 : 1
      const iterations = Math.round(14000 * modeMultiplier * loadMultiplier * loopMultiplier)

      runCpuWork(iterations, heavyPaintEnabled)

      const latencyMs = Number((performance.now() - startedAt).toFixed(1))
      const smoothnessPenalty = latencyMs * 1.6 + (heavyPaintEnabled ? 8 : 0)
      const smoothnessScore = clamp(Math.round(100 - smoothnessPenalty), 0, 100)

      setResult((currentValue) => ({
        latencyMs,
        smoothnessScore,
        runCount: (currentValue?.runCount ?? 0) + 1,
      }))
      setIsRunning(false)
    })
  }

  const handleReset = () => {
    setLoadTarget(50)
    setAnimationsEnabled(true)
    setHeavyPaintEnabled(false)
    setLiveLoopEnabled(false)
    setColorReactionMs(null)
    setColorInteractionCount(0)
    setReactionPanelColor('#2850ad')
    setResult(null)
  }

  const handleColorPanelChange = (nextColor: string) => {
    const startedAt = performance.now()
    setReactionPanelColor(nextColor)

    window.requestAnimationFrame(() => {
      setColorReactionMs(Number((performance.now() - startedAt).toFixed(1)))
      setColorInteractionCount((currentValue) => currentValue + 1)
    })
  }

  const probeStyle = useMemo(
    () => ({
      ['--benchmark-probe-load' as string]: `${Math.round((loadTarget / 100) * 280)}ms`,
    }),
    [loadTarget],
  )

  const reactionPanelStyle = useMemo(
    () => ({
      background: `linear-gradient(145deg, ${reactionPanelColor}55, rgba(255, 255, 255, 0.03))`,
    }),
    [reactionPanelColor],
  )

  return (
    <div className="benchmark-shell">
      <div className="benchmark-slider-row">
        <label className="settings-label" htmlFor="benchmark-load-target">
          <span>{widgetText.copy.targetLabel}</span>
          <input
            id="benchmark-load-target"
            className="benchmark-slider"
            type="range"
            min={10}
            max={100}
            step={5}
            value={loadTarget}
            onChange={(event) => setLoadTarget(Number(event.target.value))}
          />
        </label>
        <p className="benchmark-slider-value" aria-live="polite">
          {loadSummary}
        </p>
      </div>

      <div className="benchmark-switch-grid">
        <label className="benchmark-slide-toggle">
          <span className="benchmark-slide-toggle-label">{widgetText.copy.animationsLabel}</span>
          <input
            className="benchmark-slide-toggle-input"
            type="checkbox"
            checked={animationsEnabled}
            onChange={(event) => setAnimationsEnabled(event.target.checked)}
          />
          <span className="benchmark-slide-toggle-track" aria-hidden="true">
            <span className="benchmark-slide-toggle-thumb"></span>
          </span>
        </label>

        <label className="benchmark-slide-toggle">
          <span className="benchmark-slide-toggle-label">{widgetText.copy.heavyPaintLabel}</span>
          <input
            className="benchmark-slide-toggle-input"
            type="checkbox"
            checked={heavyPaintEnabled}
            onChange={(event) => setHeavyPaintEnabled(event.target.checked)}
          />
          <span className="benchmark-slide-toggle-track" aria-hidden="true">
            <span className="benchmark-slide-toggle-thumb"></span>
          </span>
        </label>

        <label className="benchmark-slide-toggle">
          <span className="benchmark-slide-toggle-label">{widgetText.copy.liveLoopLabel}</span>
          <input
            className="benchmark-slide-toggle-input"
            type="checkbox"
            checked={liveLoopEnabled}
            onChange={(event) => setLiveLoopEnabled(event.target.checked)}
          />
          <span className="benchmark-slide-toggle-track" aria-hidden="true">
            <span className="benchmark-slide-toggle-thumb"></span>
          </span>
        </label>
      </div>

      <div className="benchmark-action-row">
        <button
          className="terminal-button is-active"
          type="button"
          onClick={handleRunBenchmark}
          disabled={isRunning}
        >
          {isRunning ? widgetText.copy.runningAction : widgetText.copy.runAction}
        </button>

        <button
          className="terminal-button terminal-button--quiet"
          type="button"
          onClick={handleReset}
          disabled={isRunning}
        >
          {widgetText.copy.resetAction}
        </button>
      </div>

      <div className="benchmark-reaction-shell">
        <div
          className="benchmark-reaction-panel"
          style={reactionPanelStyle}
        >
          <p className="widget-kicker">{widgetText.copy.reactionPanelLabel}</p>
          <p className="benchmark-reaction-hint">{widgetText.copy.reactionPanelHint}</p>
          <p className="benchmark-reaction-value">
            {widgetText.copy.reactionLatencyLabel}:{' '}
            {colorReactionMs === null ? widgetText.copy.idleValue : `${colorReactionMs} ms`}
          </p>
        </div>

        <div className="benchmark-color-actions">
          <button
            className="terminal-button"
            type="button"
            onClick={() => handleColorPanelChange('#2850ad')}
          >
            {widgetText.copy.colorBlueAction}
          </button>
          <button
            className="terminal-button"
            type="button"
            onClick={() => handleColorPanelChange('#ff6319')}
          >
            {widgetText.copy.colorOrangeAction}
          </button>
          <button
            className="terminal-button"
            type="button"
            onClick={() => handleColorPanelChange('#34d399')}
          >
            {widgetText.copy.colorGreenAction}
          </button>
          <button
            className="terminal-button"
            type="button"
            onClick={() => handleColorPanelChange('#ef4444')}
          >
            {widgetText.copy.colorRedAction}
          </button>
        </div>
      </div>

      <div className="benchmark-metrics-grid" aria-live="polite">
        <article className="benchmark-metric-card">
          <p className="widget-kicker">{widgetText.copy.latencyLabel}</p>
          <p className="benchmark-metric-value">
            {result ? `${result.latencyMs} ms` : widgetText.copy.idleValue}
          </p>
        </article>

        <article className="benchmark-metric-card">
          <p className="widget-kicker">{widgetText.copy.smoothnessLabel}</p>
          <p className="benchmark-metric-value">
            {result ? `${result.smoothnessScore}%` : widgetText.copy.idleValue}
          </p>
        </article>

        <article className="benchmark-metric-card">
          <p className="widget-kicker">{widgetText.copy.interactionsLabel}</p>
          <p className="benchmark-metric-value">
            {(result?.runCount ?? 0) + colorInteractionCount}
          </p>
        </article>
      </div>

      <div className={`benchmark-probe${motionClassName}`} style={probeStyle} aria-hidden="true" />
    </div>
  )
}
