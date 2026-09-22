import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  VOICE_TRACE_MAX_EVENTS,
  formatVoiceTrace,
  formatVoiceTraceLine,
  getVoiceTraceSnapshot,
  resetVoiceTraceForTests,
  startVoiceTrace,
  subscribeVoiceTrace,
  traceVoiceEvent,
} from '../voiceTrace.ts';

describe('voiceTrace', () => {
  beforeEach(() => {
    resetVoiceTraceForTests();
  });

  it('records seq, elapsed and delta per event (positive)', () => {
    startVoiceTrace(1000);
    const first = traceVoiceEvent('record-pressed', 'lang=de', 1000);
    const second = traceVoiceEvent('stop-pressed', undefined, 1087);
    const third = traceVoiceEvent('saving', 'bytes=12 samples=2', 2234);

    assert.equal(first.seq, 1);
    assert.equal(first.elapsedMs, 0);
    assert.equal(first.deltaMs, 0);
    assert.equal(second.seq, 2);
    assert.equal(second.elapsedMs, 87);
    assert.equal(second.deltaMs, 87);
    assert.equal(third.seq, 3);
    assert.equal(third.elapsedMs, 1234);
    assert.equal(third.deltaMs, 1147);
    assert.deepEqual(
      getVoiceTraceSnapshot().map((event) => event.stage),
      ['record-pressed', 'stop-pressed', 'saving'],
    );
  });

  it('implicitly opens a trace when none was started (positive)', () => {
    const event = traceVoiceEvent('tts-triggered', 'chars=10', 5000);

    assert.equal(event.seq, 1);
    assert.equal(event.elapsedMs, 0);
    assert.equal(getVoiceTraceSnapshot().length, 1);
  });

  it('a mic press restarts the trace (positive)', () => {
    startVoiceTrace(1000);
    traceVoiceEvent('record-pressed', undefined, 1000);
    startVoiceTrace(2000);
    const event = traceVoiceEvent('record-pressed', undefined, 2000);

    assert.equal(event.seq, 1);
    assert.equal(event.elapsedMs, 0);
    assert.equal(getVoiceTraceSnapshot().length, 1);
  });

  it('caps the trace at the maximum event count (negative: unbounded growth)', () => {
    startVoiceTrace(0);

    for (let index = 0; index < VOICE_TRACE_MAX_EVENTS + 5; index += 1) {
      traceVoiceEvent('tts-play-start', undefined, index);
    }

    const snapshot = getVoiceTraceSnapshot();
    assert.equal(snapshot.length, VOICE_TRACE_MAX_EVENTS);
    assert.equal(snapshot[snapshot.length - 1]?.seq, VOICE_TRACE_MAX_EVENTS + 5);
  });

  it('notifies subscribers and supports unsubscribe (positive)', () => {
    startVoiceTrace(0);
    let callsA = 0;
    let callsB = 0;
    const unsubscribeA = subscribeVoiceTrace(() => {
      callsA += 1;
    });
    subscribeVoiceTrace(() => {
      callsB += 1;
    });

    traceVoiceEvent('record-pressed', undefined, 0);
    unsubscribeA();
    traceVoiceEvent('stop-pressed', undefined, 10);

    assert.equal(callsA, 1);
    assert.equal(callsB, 2);
  });

  it('keeps a stable snapshot identity without mutations (positive)', () => {
    startVoiceTrace(0);
    traceVoiceEvent('record-pressed', undefined, 0);

    assert.equal(getVoiceTraceSnapshot(), getVoiceTraceSnapshot());
  });

  it('formats one paste-ready line with clock, elapsed and delta (positive)', () => {
    startVoiceTrace(1000);
    const event = traceVoiceEvent('record-pressed', 'lang=de', 1087);

    assert.equal(
      formatVoiceTraceLine(event),
      '00:00:01.087 +87ms Δ+0ms record-pressed lang=de',
    );
  });

  it('formats a first event without detail and joins the whole trace (positive)', () => {
    startVoiceTrace(3_600_000);
    const event = traceVoiceEvent('record-pressed', undefined, 3_601_500);

    assert.equal(formatVoiceTraceLine(event), '01:00:01.500 +1.50s Δ+0ms record-pressed');
    assert.equal(formatVoiceTrace(getVoiceTraceSnapshot()), formatVoiceTraceLine(event));
  });
});
