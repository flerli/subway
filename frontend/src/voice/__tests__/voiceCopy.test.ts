import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { appTextCatalog } from '../../i18n/appText.ts';
import type { AppTextBundle } from '../../i18n/appText.ts';
import type { SupportedLanguageCode } from '../../i18n/localization.ts';
import { resolveVoiceErrorCopy } from '../voiceCopy.ts';
import type { VoiceCaptureErrorCode } from '../voiceCapture.ts';

const LANGUAGES: readonly SupportedLanguageCode[] = ['en', 'de', 'fr', 'es'];

const voiceSection = (
  language: SupportedLanguageCode,
): AppTextBundle['voice'] => appTextCatalog[language].voice;

const EXPECTED_VOICE_KEYS = [
  'micLabel',
  'stopLabel',
  'workingLabel',
  'unsupportedLabel',
  'errorDenied',
  'errorNoDevice',
  'errorModelMissing',
  'errorTranscribeFailed',
  'errorSubmitFailed',
  'errorTooLong',
  'errorEmpty',
  'errorBusy',
  'errorAborted',
  'errorUnsupported',
  'errorDecodeFailed',
  'telemetryLabel',
  'telemetryCopyAction',
  'telemetryCopiedState',
] as const;

const ERROR_CODES: VoiceCaptureErrorCode[] = [
  'unsupported',
  'denied',
  'no-device',
  'decode-failed',
  'too-long',
  'empty',
  'aborted',
  'busy',
  'model-missing',
  'transcribe-failed',
  'submit-failed',
];

describe('voice i18n key coverage', () => {
  it('ships every voice key non-empty in all four board languages', () => {
    assert.deepEqual(
      Object.keys(appTextCatalog).sort(),
      [...LANGUAGES].sort(),
    );

    for (const language of LANGUAGES) {
      const voice = voiceSection(language) as unknown as Record<string, unknown>;

      for (const key of EXPECTED_VOICE_KEYS) {
        const value: unknown = voice[key];
        assert.equal(typeof value, 'string', `${language}.voice.${String(key)}`);
        assert.ok(
          (value as string).trim().length > 0,
          `${language}.voice.${String(key)} non-empty`,
        );
      }
    }
  });

  it('keeps voice copy ASCII-only per the repo convention (positive)', () => {
    for (const language of LANGUAGES) {
      const voice = voiceSection(language) as unknown as Record<string, string>;

      for (const key of EXPECTED_VOICE_KEYS) {
        const value = voice[key] ?? '';

        for (const character of value) {
          assert.ok(
            character.charCodeAt(0) <= 127,
            `ASCII-only ${language}.voice.${String(key)}`,
          );
        }
      }
    }
  });
});

describe('resolveVoiceErrorCopy', () => {
  const english: AppTextBundle = appTextCatalog.en;

  it('maps every error code to distinct guidance copy (positive)', () => {
    const copies = ERROR_CODES.map((code) => resolveVoiceErrorCopy(english, code));

    for (const copy of copies) {
      assert.ok(copy.trim().length > 0);
    }

    assert.equal(new Set(copies).size, ERROR_CODES.length);
  });

  it('falls back to generic guidance for unknown codes (negative)', () => {
    assert.equal(
      resolveVoiceErrorCopy(english, 'something-new'),
      english.voice.errorTranscribeFailed,
    );
  });

  it('resolves in the board language (positive)', () => {
    assert.equal(
      resolveVoiceErrorCopy(appTextCatalog.de, 'denied'),
      appTextCatalog.de.voice.errorDenied,
    );
    assert.notEqual(
      resolveVoiceErrorCopy(appTextCatalog.fr, 'busy'),
      resolveVoiceErrorCopy(appTextCatalog.es, 'busy'),
    );
  });
});
