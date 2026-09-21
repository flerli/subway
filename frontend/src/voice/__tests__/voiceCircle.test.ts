import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { voiceCircleStyle } from '../voiceCircle.ts';

describe('voiceCircleStyle', () => {
  it('renders idle and error distinctly (positive)', () => {
    const idle = voiceCircleStyle(0.9, 'idle');
    const error = voiceCircleStyle(0, 'error');
    assert.equal(idle.scale, 1);
    assert.ok(idle.opacity < error.opacity);
    assert.notEqual(idle.background, error.background);
  });

  it('scales with the scalar level while listening (positive)', () => {
    const quiet = voiceCircleStyle(0.1, 'listening');
    const loud = voiceCircleStyle(0.9, 'listening');
    assert.ok(loud.scale > quiet.scale);
    assert.ok(loud.opacity >= quiet.opacity);
    assert.ok(loud.boxShadow !== 'none');
  });

  it('clamps out-of-range and non-finite levels (negative)', () => {
    assert.equal(voiceCircleStyle(5, 'listening').scale, 1.35);
    assert.equal(voiceCircleStyle(-3, 'listening').scale, 1);
    assert.equal(voiceCircleStyle(Number.NaN, 'listening').scale, 1);
  });

  it('freezes the pulse under reduced motion (positive: accessibility)', () => {
    assert.equal(voiceCircleStyle(0.9, 'listening', 'input', true).scale, 1);
    assert.equal(voiceCircleStyle(0.9, 'listening', 'input', false).scale > 1, true);
  });

  it('tints output differently from input (positive: TC-B-02 shares the language)', () => {
    const input = voiceCircleStyle(0.5, 'listening', 'input');
    const output = voiceCircleStyle(0.5, 'listening', 'output');
    assert.notEqual(input.background, output.background);
    assert.equal(input.scale, output.scale);
  });

  it('keeps working states steady without glow (positive)', () => {
    for (const state of ['transcribing', 'submitting', 'requesting'] as const) {
      const style = voiceCircleStyle(0.5, state);
      assert.equal(style.boxShadow, 'none');
      assert.equal(style.opacity, 0.8);
    }
  });
});
