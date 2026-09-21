import type { AppTextBundle } from '../i18n/appText.ts'
import type { VoiceCaptureErrorCode } from './voiceCapture.ts'

/**
 * Voice error-code → localized copy mapping (SW-REQ-013-04).
 *
 * Why a pure module: the full error taxonomy (every code, every board
 * language, unknown-code fallback) is unit-tested without rendering. Both
 * the top-bar note and the transcript note render from this one function so
 * the two surfaces can never disagree.
 */
export function resolveVoiceErrorCopy(
  appText: AppTextBundle,
  code: VoiceCaptureErrorCode | string,
): string {
  switch (code) {
    case 'denied':
      return appText.voice.errorDenied;
    case 'no-device':
      return appText.voice.errorNoDevice;
    case 'model-missing':
      return appText.voice.errorModelMissing;
    case 'transcribe-failed':
      return appText.voice.errorTranscribeFailed;
    case 'submit-failed':
      return appText.voice.errorSubmitFailed;
    case 'too-long':
      return appText.voice.errorTooLong;
    case 'empty':
      return appText.voice.errorEmpty;
    case 'busy':
      return appText.voice.errorBusy;
    case 'aborted':
      return appText.voice.errorAborted;
    case 'unsupported':
      return appText.voice.errorUnsupported;
    case 'decode-failed':
      return appText.voice.errorDecodeFailed;
    default:
      return appText.voice.errorTranscribeFailed;
  }
}
