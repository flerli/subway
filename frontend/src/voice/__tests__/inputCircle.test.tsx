import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { InputLevelCircle } from '../InputLevelCircle.tsx';

describe('InputLevelCircle', () => {
  it('renders per state with localized labels (positive)', () => {
    const listening = renderToStaticMarkup(
      createElement(InputLevelCircle, {
        readLevel: () => 0.5,
        active: true,
        captureState: 'listening',
        label: 'Listening',
      }),
    );
    const error = renderToStaticMarkup(
      createElement(InputLevelCircle, {
        readLevel: () => 0,
        active: false,
        captureState: 'error',
        label: 'Fehler',
      }),
    );

    assert.ok(listening.includes('voice-circle--listening'));
    assert.ok(listening.includes('aria-label="Listening"'));
    assert.ok(listening.includes('role="img"'));
    assert.ok(error.includes('voice-circle--error'));
    assert.ok(error.includes('aria-label="Fehler"'));
    assert.ok(!error.includes('voice-circle--listening'));
  });

  it('carries no audio data in markup (negative: PII)', () => {
    const markup = renderToStaticMarkup(
      createElement(InputLevelCircle, {
        readLevel: () => 0.8,
        active: true,
        captureState: 'listening',
        label: 'Listening',
      }),
    );

    assert.ok(!markup.includes('Float32'));
    assert.ok(!markup.includes('base64'));
    assert.ok(markup.includes('data-voice-level="0.00"'));
  });
});
