import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getVoicePrefsState,
  resetVoicePrefsStateForTests,
  setVoicePrefsState,
  subscribeVoicePrefsState,
} from '../voicePrefsStore.ts';
import type { VoicePrefsState } from '../voicePrefsStore.ts';

describe('voicePrefsStore', () => {
  beforeEach(() => {
    resetVoicePrefsStateForTests();
  });

  it('starts with F1/80/1.2x enabled defaults (positive)', () => {
    assert.deepEqual(getVoicePrefsState(), {
      ttsEnabled: true,
      voice: 'F1',
      volume: 80,
      speed: 1.2,
    });
  });

  it('clamps speed and volume (positive + negative)', () => {
    setVoicePrefsState({ ttsEnabled: false, voice: 'm3', volume: 250, speed: 9 });
    assert.equal(getVoicePrefsState().speed, 1.5);
    setVoicePrefsState({ ttsEnabled: true, voice: 'F5', volume: -10, speed: 0.1 });
    assert.equal(getVoicePrefsState().speed, 0.75);
    assert.equal(getVoicePrefsState().volume, 0);
  });

  it('updates subscribers and clamps input (positive + negative)', () => {
    const receivedBox: { value: VoicePrefsState | null } = { value: null };
    const unsubscribe = subscribeVoicePrefsState(() => {
      receivedBox.value = getVoicePrefsState();
    });

    setVoicePrefsState({ ttsEnabled: false, voice: 'm3', volume: 250, speed: 1.3 });
    assert.equal(receivedBox.value?.ttsEnabled, false);
    assert.equal(receivedBox.value?.voice, 'M3');
    assert.equal(receivedBox.value?.volume, 100);
    assert.equal(receivedBox.value?.speed, 1.3);

    setVoicePrefsState({ ttsEnabled: true, voice: 'F5', volume: -10, speed: 1.0 });
    assert.equal(getVoicePrefsState().volume, 0);

    unsubscribe();
    setVoicePrefsState({ ttsEnabled: true, voice: 'F2', volume: 50, speed: 1.1 });
    // Unsubscribed: the box keeps the last received snapshot (F5 from set #2).
    assert.equal(receivedBox.value?.voice, 'F5');
  });
});

describe('playback guard integration (store → prefs)', () => {
  it('the store state feeds the playback getPrefs contract (positive)', async () => {
    const { VoicePlaybackController } = await import('../voicePlayback.ts');
    const submitted: Array<{ voice: string; speed: number }> = [];
    const controller = new VoicePlaybackController({
      getPrefs: () => getVoicePrefsState(),
      language: () => 'de',
      synthesize: async (chunk) => {
        submitted.push({ voice: chunk.voice, speed: chunk.speed });
        return {
          audioDataUrl: 'data:audio/mpeg;base64,eA==',
          durationMs: 500,
          voice: chunk.voice,
          language: chunk.lang,
          speed: chunk.speed,
          cacheHit: false,
        };
      },
      createPlayer: () => ({
        play: async () => undefined,
        pause: () => undefined,
        volume: 1,
        onended: null,
        src: '',
        duration: 0,
      }),
      createOutputLevels: () => null,
    });

    setVoicePrefsState({ ttsEnabled: true, voice: 'M4', volume: 60, speed: 1.4 });
    await controller.enqueueMessage('m', 'Hallo. Welt.');
    assert.deepEqual(submitted, [{ voice: 'M4', speed: 1.4 }]);
    controller.interrupt();

    setVoicePrefsState({ ttsEnabled: false, voice: 'M4', volume: 60, speed: 1.4 });
    await controller.enqueueMessage('m', 'Hallo. Welt.');
    assert.deepEqual(submitted, [{ voice: 'M4', speed: 1.4 }], 'disabled TTS emits nothing');
    controller.interrupt();
  });
});