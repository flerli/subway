import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VoiceMicButton } from '../VoiceMicButton.tsx';

describe('VoiceMicButton', () => {
  it('renders the idle mic without a circle (positive)', () => {
    const markup = renderToStaticMarkup(
      createElement(VoiceMicButton, {
        captureState: 'idle',
        turnBusy: false,
        supported: true,
        onToggle: () => undefined,
        readLevel: () => 0.5,
      }),
    );

    assert.ok(markup.includes('aria-label="Voice input"'));
    assert.ok(!markup.includes('voice-circle'));
    assert.ok(!markup.includes('disabled'));
  });

  it('renders stop + circle while listening (positive)', () => {
    const markup = renderToStaticMarkup(
      createElement(VoiceMicButton, {
        captureState: 'listening',
        turnBusy: false,
        supported: true,
        onToggle: () => undefined,
        readLevel: () => 0.5,
        circleLabel: 'Hoert zu',
      }),
    );

    assert.ok(markup.includes('aria-label="Stop listening"'));
    assert.ok(markup.includes('voice-circle--listening'));
    assert.ok(markup.includes('aria-label="Hoert zu"'));
  });

  it('disables fail-closed states with working copy (negative)', () => {
    const working = renderToStaticMarkup(
      createElement(VoiceMicButton, {
        captureState: 'transcribing',
        turnBusy: false,
        supported: true,
        onToggle: () => undefined,
      }),
    );
    const unsupported = renderToStaticMarkup(
      createElement(VoiceMicButton, {
        captureState: 'idle',
        turnBusy: false,
        supported: false,
        onToggle: () => undefined,
      }),
    );
    const busy = renderToStaticMarkup(
      createElement(VoiceMicButton, {
        captureState: 'idle',
        turnBusy: true,
        supported: true,
        onToggle: () => undefined,
      }),
    );

    assert.ok(working.includes('aria-label="Working..."'));
    assert.ok(working.includes('disabled'));
    assert.ok(unsupported.includes('aria-label="Voice input unavailable"'));
    assert.ok(unsupported.includes('disabled'));
    assert.ok(busy.includes('disabled'));
  });
});
