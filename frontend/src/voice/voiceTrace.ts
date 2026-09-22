/**
 * Per-utterance voice pipeline trace (SW-REQ-013 diagnostics).
 *
 * One trace runs from the mic press to TTS playback start; every stage
 * appends an event carrying the wall-clock timestamp, the elapsed time
 * since the trace started, and the delta since the previous event. The
 * assistant extended view renders the trace as its log column, so a kiosk
 * diagnosis is one copy-paste.
 *
 * PRIVACY CONTRACT: details carry counts, ids, model names, timings and
 * error codes only — never transcript text, answer text, or audio. Keep it
 * that way: the log column is designed to be pasted into chat.
 */
export type VoiceTraceStage =
  | 'record-pressed'
  | 'stop-pressed'
  | 'saving'
  | 'stt-send'
  | 'stt-received'
  | 'llm-send'
  | 'llm-received'
  | 'tts-triggered'
  | 'tts-received'
  | 'tts-play-start';

export interface VoiceTraceEvent {
  /** 1-based position inside the current trace. */
  readonly seq: number;
  /** Wall-clock timestamp (ISO, UTC). */
  readonly timestamp: string;
  /** Epoch millis of the event (for elapsed/delta math). */
  readonly timestampMs: number;
  /** Millis since the trace started (0 for the first event). */
  readonly elapsedMs: number;
  /** Millis since the previous event (0 for the first event). */
  readonly deltaMs: number;
  readonly stage: VoiceTraceStage;
  /** Counts/ids/models/timings/codes only — never spoken or answered text. */
  readonly detail?: string;
}

/** Upper bound: a trace never grows past one screenful of history. */
export const VOICE_TRACE_MAX_EVENTS = 100;

let traceEvents: VoiceTraceEvent[] = [];
let traceStartMs = 0;
// Monotonic per-trace sequence (the capped buffer reuses length, so
// `length + 1` would plateau and duplicate seqs once the cap is hit).
let traceSeq = 0;
let traceSnapshot: readonly VoiceTraceEvent[] = [];
const traceListeners = new Set<() => void>();

const publishTrace = (): void => {
  traceSnapshot = Object.freeze([...traceEvents]);
  traceListeners.forEach((listener) => {
    listener();
  });
};

/**
 * Start a new trace (called on every mic press). Drops the previous trace.
 * `nowMs` is a test seam (defaults to the wall clock).
 */
export const startVoiceTrace = (nowMs: number = Date.now()): void => {
  traceEvents = [];
  traceStartMs = nowMs;
  traceSeq = 0;
  publishTrace();
};

/**
 * Append one stage event to the current trace. When no trace was started
 * (e.g. a replay without a preceding mic press) the event implicitly opens
 * one so nothing is ever lost silently.
 */
export const traceVoiceEvent = (
  stage: VoiceTraceStage,
  detail?: string,
  nowMs: number = Date.now(),
): VoiceTraceEvent => {
  if (traceEvents.length === 0 && traceStartMs === 0) {
    traceStartMs = nowMs;
  }

  const previous = traceEvents[traceEvents.length - 1];
  traceSeq += 1;
  const event: VoiceTraceEvent = {
    seq: traceSeq,
    timestamp: new Date(nowMs).toISOString(),
    timestampMs: nowMs,
    elapsedMs: Math.max(0, nowMs - traceStartMs),
    deltaMs: previous ? Math.max(0, nowMs - previous.timestampMs) : 0,
    stage,
    ...(detail === undefined ? {} : { detail }),
  };

  traceEvents = [...traceEvents, event].slice(-VOICE_TRACE_MAX_EVENTS);
  publishTrace();

  return event;
};

/**
 * React snapshot: a referentially stable array (identity changes only when
 * the trace changes), suitable for `useSyncExternalStore`.
 */
export const getVoiceTraceSnapshot = (): readonly VoiceTraceEvent[] =>
  traceSnapshot;

/** Subscribe to trace changes; returns an unsubscribe function. */
export const subscribeVoiceTrace = (listener: () => void): (() => void) => {
  traceListeners.add(listener);

  return () => {
    traceListeners.delete(listener);
  };
};

/** Test seam: drop the current trace and all listeners. */
export const resetVoiceTraceForTests = (): void => {
  traceEvents = [];
  traceStartMs = 0;
  traceSeq = 0;
  traceListeners.clear();
  publishTrace();
};

const pad2 = (value: number): string => String(value).padStart(2, '0');

const formatClock = (timestampMs: number): string => {
  const date = new Date(timestampMs);

  return (
    `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:` +
    `${pad2(date.getUTCSeconds())}.${String(date.getUTCMilliseconds()).padStart(3, '0')}`
  );
};

const formatDuration = (millis: number): string => {
  if (millis < 1000) {
    return `${millis}ms`;
  }

  return `${(millis / 1000).toFixed(2)}s`;
};

/**
 * One paste-ready log line per event:
 * `12:04:31.204 +1.23s Δ+87ms record-pressed lang=de`.
 */
export const formatVoiceTraceLine = (event: VoiceTraceEvent): string => {
  const detail = event.detail ? ` ${event.detail}` : '';

  return (
    `${formatClock(event.timestampMs)} ` +
    `+${formatDuration(event.elapsedMs)} ` +
    `Δ+${formatDuration(event.deltaMs)} ` +
    `${event.stage}${detail}`
  );
};

/** Whole current trace as multi-line text (for the copy button). */
export const formatVoiceTrace = (events: readonly VoiceTraceEvent[]): string =>
  events.map(formatVoiceTraceLine).join('\n');
