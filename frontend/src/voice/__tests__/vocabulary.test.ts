import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInitialPrompt,
  normalizeSttLanguage,
  postCorrectTranscript,
} from '../vocabulary.ts';

describe('postCorrectTranscript', () => {
  it('repairs mangled domain words (positive)', () => {
    assert.equal(
      postCorrectTranscript('starte swabian und frage sky-co nach roborock'),
      'starte Swaibian und frage scaiCo nach Roborock',
    );
    assert.equal(postCorrectTranscript('SKY CO status'), 'scaiCo status');
    assert.equal(postCorrectTranscript('robo rock saugt'), 'Roborock saugt');
    assert.equal(postCorrectTranscript('brink liste öffnen'), 'Bring liste öffnen');
    assert.equal(postCorrectTranscript('zeige das sabway board'), 'zeige das Subway board');
  });

  it('leaves clean transcripts untouched (positive)', () => {
    const clean = 'Swaibian zeigt das Wetter für Berlin';
    assert.equal(postCorrectTranscript(clean), clean);
  });

  it('never rewrites the German verb "bring" (negative: false positive)', () => {
    assert.equal(
      postCorrectTranscript('bring mir bitte Milch mit'),
      'bring mir bitte Milch mit',
    );
  });

  it('handles empty and punctuation-heavy input (negative)', () => {
    assert.equal(postCorrectTranscript(''), '');
    assert.equal(postCorrectTranscript('… ???'), '… ???');
  });
});

describe('buildInitialPrompt', () => {
  it('biases the decoder toward our spellings in every board language', () => {
    for (const code of ['en', 'de', 'fr', 'es'] as const) {
      const prompt = buildInitialPrompt(code);
      assert.ok(prompt.includes('Swaibian'));
      assert.ok(prompt.includes('scaiCo'));
      assert.ok(prompt.includes('Roborock'));
    }
    assert.ok(buildInitialPrompt('de').includes('German'));
  });
});

describe('normalizeSttLanguage', () => {
  it('passes board languages through (positive)', () => {
    assert.equal(normalizeSttLanguage('en'), 'en');
    assert.equal(normalizeSttLanguage('DE'), 'de');
    assert.equal(normalizeSttLanguage(' fr '), 'fr');
    assert.equal(normalizeSttLanguage('es'), 'es');
  });

  it('falls back to auto-detection for unknown input (negative)', () => {
    assert.equal(normalizeSttLanguage('it'), 'auto');
    assert.equal(normalizeSttLanguage(null), 'auto');
    assert.equal(normalizeSttLanguage(undefined), 'auto');
  });
});
