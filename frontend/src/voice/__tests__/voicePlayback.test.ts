import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import {
  VoicePlaybackController,
  type PlayableAudio,
  type VoicePlaybackDeps,
} from '../voicePlayback.ts';

const makePlayer = (): PlayableAudio & EventEmitter => {
  const emitter = Object.assign(
    new EventEmitter() as EventEmitter & PlayableAudio,
    {
      play: async () => {
        emitter.emit('playing');
      },
      pause: () => {
        emitter.emit('paused');
      },
      volume: 1,
      onended: null as ((ev: Event) => void) | null,
      src: '',
    },
  );
  return emitter;
};

interface Harness {
  controller: VoicePlaybackController;
  submitted: Array<{ text: string; voice: string; lang: string }>;
  players: Array<PlayableAudio & EventEmitter>;
  volumeChanges: number[];
  errors: string[];
}

const makeHarness = (
  overrides: Partial<VoicePlaybackDeps> = {},
): Harness => {
  const submitted: Array<{ text: string; voice: string; lang: string }> = [];
  const players: Array<PlayableAudio & EventEmitter> = [];
  const volumeChanges: number[] = [];
  const errors: string[] = [];
  const deps: VoicePlaybackDeps = {
    synthesize: async (chunk) => {
      submitted.push(chunk);
      return {
        audioDataUrl: `data:audio/mpeg;base64,${Buffer.from(chunk.text).toString('base64')}`,
        durationMs: 1000,
        voice: chunk.voice,
        language: chunk.lang,
        speed: chunk.speed,
        cacheHit: false,
      };
    },
    createPlayer: () => {
      const player = makePlayer();
      players.push(player);
      return player;
    },
    createOutputLevels: (player) => {
      const emitter = player as unknown as EventEmitter;
      let active = true;
      emitter.on('playing', () => {
        active = true;
      });
      emitter.on('paused', () => {
        active = false;
      });
      player.volume = 0.8;
      return {
        sampler: () => (active ? 0.5 : 0),
        dispose: () => {
          active = false;
        },
      };
    },
    getPrefs: () => ({ ttsEnabled: true, voice: 'F1', volume: 80, speed: 1.2 }),
    language: () => 'de',
    onError: (code) => {
      errors.push(code);
    },
    ...overrides,
  };
  const controller = new VoicePlaybackController(deps);
  const originalSetVolume = controller.setVolume.bind(controller);
  controller.setVolume = (volume: number) => {
    volumeChanges.push(volume);
    originalSetVolume(volume);
  };
  return { controller, submitted, players, volumeChanges, errors };
};

const endCurrent = (harness: Harness) => {
  harness.players[harness.players.length - 1]?.onended?.(new Event('ended'));
};

const flush = async (rounds: number = 30): Promise<void> => {
  for (let index = 0; index < rounds; index += 1) {
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }
};

describe('VoicePlaybackController', () => {
  beforeEach(() => {
    // Fresh harness per test.
  });

  it('strips + chunks + autoplays a long answer in order (positive)', async () => {
    const harness = makeHarness();
    const markdown = '## Intro\n\n```js\nconst code = 1\n```\n\n' +
      'A sentence one. B sentence two. C sentence three. D sentence four. E sentence five. F sentence six. G sentence seven.';
    await harness.controller.enqueueMessage('msg-1', markdown);
    await flush();
    // Advance the sequential queue: end the finished chunk so the next starts.
    harness.players[harness.players.length - 1]?.onended?.(new Event('ended'));
    await flush();
    assert.equal(harness.controller.getSnapshot().playing, true);
    assert.equal(harness.controller.getSnapshot().speakingMessageId, 'msg-1');
    // The submitted chunks come from the stripped, chunked speech (code fence removed).
    assert.ok(harness.submitted.length >= 2, `chunked ${harness.submitted.length}`);
    assert.ok(!harness.submitted.some((chunk) => chunk.text.includes('code')));
    assert.ok(harness.players.length >= 2);
  });

  it('replays a message by id (positive)', async () => {
    const harness = makeHarness();
    await harness.controller.enqueueMessage('msg-1', 'Only one sentence.');
    await flush();
    endCurrent(harness);
    await flush();
    await harness.controller.playMessage('msg-1', 'Only one sentence.');
    await flush();
    assert.equal(harness.submitted.length, 2);
  });

  it('interrupt on tap/unmount stops immediately (positive)', async () => {
    const harness = makeHarness();
    await harness.controller.playMessage('msg-1', 'One. Two. Three.');
    await flush();
    harness.controller.interrupt();
    assert.equal(harness.controller.getSnapshot().playing, false);
    assert.equal(harness.controller.getSnapshot().speakingMessageId, null);
  });

  it('honors volume changes on the live player (positive)', async () => {
    const harness = makeHarness();
    await harness.controller.playMessage('msg-1', 'One. Two.');
    await flush();
    harness.controller.setVolume(30);
    assert.equal(harness.volumeChanges[0], 30);
    assert.equal(harness.players[0]?.volume, 0.3);
  });

  it('stays silent when TTS is disabled (negative)', async () => {
    const harness = makeHarness({ getPrefs: () => ({ ttsEnabled: false, voice: 'M1', volume: 50, speed: 1.2 }) });
    await harness.controller.enqueueMessage('msg-1', 'One. Two.');
    await flush();
    assert.equal(harness.submitted.length, 0);
    assert.equal(harness.controller.getSnapshot().playing, false);
  });

  it('reports a synthesis failure through onError (negative: fail-closed copy)', async () => {
    const harness = makeHarness({
      synthesize: async () => {
        throw new Error('Unavailable');
      },
    });
    await harness.controller.enqueueMessage('msg-1', 'One. Two.');
    await flush();
    assert.equal(harness.controller.getSnapshot().playing, false);
    assert.equal(harness.players.length, 1);
    assert.deepEqual(harness.errors, ['tts-unavailable']);
  });

  it('reports a blocked play() through onError instead of dying silently (negative: autoplay/policy)', async () => {
    const harness = makeHarness({
      createPlayer: () => {
        const player = makePlayer();
        player.play = async () => {
          throw new Error('play() failed because the user didn\'t interact with the document first');
        };
        return player;
      },
    });
    await harness.controller.enqueueMessage('msg-1', 'One. Two.');
    await flush();
    assert.equal(harness.controller.getSnapshot().playing, false);
    assert.deepEqual(harness.errors, ['tts-unavailable']);
  });

  it('does not report onError on successful playback (positive)', async () => {
    const harness = makeHarness();
    await harness.controller.enqueueMessage('msg-1', 'One. Two.');
    await flush();
    endCurrent(harness);
    await flush();
    assert.equal(harness.submitted.length, 1);
    assert.deepEqual(harness.errors, []);
  });

  it('applies the voice prefs to synthesis (positive)', async () => {
    const harness = makeHarness({ getPrefs: () => ({ ttsEnabled: true, voice: 'M3', volume: 60, speed: 1.2 }) });
    await harness.controller.enqueueMessage('msg-1', 'One. Two. Three.');
    await flush();
    assert.ok(harness.submitted.every((chunk) => chunk.voice === 'M3'));
  });
});