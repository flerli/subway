import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VoiceTelemetryField } from '../VoiceTelemetryField.tsx';

describe('VoiceTelemetryField', () => {
  it('renders the telemetry line in a read-only field with a copy button (positive)', () => {
    const markup = renderToStaticMarkup(
      createElement(VoiceTelemetryField, {
        telemetry: '[voice] stt servedBy=local de samples=16000 ok=true',
        label: 'Speech info',
        copyLabel: 'Copy',
        copiedLabel: 'Copied',
      }),
    );

    assert.ok(markup.includes('assistant-telemetry-row'));
    assert.ok(markup.includes('value="[voice] stt servedBy=local de samples=16000 ok=true"'));
    assert.ok(markup.includes('readOnly'));
    assert.ok(markup.includes('aria-label="Copy"'));
    assert.ok(markup.includes('>Copy<'));
    assert.ok(!markup.includes('16000 samples of audio'), 'no audio data in props path');
  });
});
