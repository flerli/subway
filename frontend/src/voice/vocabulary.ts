import type { SupportedLanguageCode } from '../i18n/localization.ts'

/**
 * Domain-vocabulary bias for Whisper-tiny (tech doc §1.4).
 *
 * Why (SW-REQ-013-01): `tiny` is the smallest Whisper and mangles product
 * names. Two complementary mitigations live in this one shared module so
 * every STT entry point spells Swaibian/scaiCo/Roborock correctly:
 * 1. `buildInitialPrompt` biases the decoder toward our spellings.
 * 2. `postCorrectTranscript` deterministically repairs what slips through.
 */

interface CorrectionRule {
  readonly pattern: RegExp;
  readonly replacement: string;
}

/**
 * Ordered, word-boundaried corrections. Deliberately conservative: only
 * unambiguous manglings are repaired. Bare "bring" is NOT touched — it is a
 * common German verb ("bring mir …") and "correcting" it would corrupt
 * everyday speech.
 */
const DOMAIN_CORRECTION_RULES: readonly CorrectionRule[] = [
  {
    // Whisper-tiny real-world renderings of "Swaibian" (incl. probe-verified
    // "Svebian" and English-mode "Webeian").
    pattern:
      /\b(swabian|swaiben|swaybian|swibian|schwabian|svebian|swebian|swevian|sweibian|svaibian|webeian)\b/gi,
    replacement: 'Swaibian',
  },
  {
    pattern: /\b(sky[\s-]?co|scaico|skaiko|scayco|caico)\b/gi,
    replacement: 'scaiCo',
  },
  {
    pattern: /\b(robo[\s-]?rock|roborok|robo rok)\b/gi,
    replacement: 'Roborock',
  },
  {
    pattern: /\b(brink|pring)([\s-]?(liste|einkaufsliste|shopping))?\b/gi,
    replacement: 'Bring$2',
  },
  {
    pattern: /\bsabway\b/gi,
    replacement: 'Subway',
  },
];

/** Repair mangled domain words; returns the input unchanged when clean. */
export function postCorrectTranscript(transcript: string): string {
  let corrected = transcript;

  for (const rule of DOMAIN_CORRECTION_RULES) {
    rule.pattern.lastIndex = 0;
    corrected = corrected.replace(rule.pattern, rule.replacement);
  }

  return corrected;
}

/** Decoder-bias vocabulary string for the Whisper `initial_prompt`. */
export function buildInitialPrompt(
  languageCode: SupportedLanguageCode,
): string {
  const languageNames: Record<SupportedLanguageCode, string> = {
    en: 'English',
    de: 'German',
    fr: 'French',
    es: 'Spanish',
  };

  return (
    `User language: ${languageNames[languageCode]}. ` +
    'Proper nouns are spelled exactly: Swaibian, scaiCo, Subway, Bring, Roborock.'
  );
}

export type SttLanguage = 'en' | 'de' | 'fr' | 'es' | 'auto';

/**
 * Map the board language to a Whisper language. Unknown input falls back to
 * `auto` (decoder language detection) rather than guessing wrong.
 */
export function normalizeSttLanguage(value: unknown): SttLanguage {
  switch (typeof value === 'string' ? value.trim().toLowerCase() : '') {
    case 'en':
      return 'en';
    case 'de':
      return 'de';
    case 'fr':
      return 'fr';
    case 'es':
      return 'es';
    default:
      return 'auto';
  }
}
