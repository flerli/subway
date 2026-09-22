/**
 * Clipboard copy for the voice telemetry field (SW-REQ-013-04).
 *
 * Contract: `copyTextToClipboard` returns true on success, false otherwise.
 * It prefers the async Clipboard API and falls back to a hidden textarea +
 * `execCommand('copy')` for non-secure contexts. All browser access is
 * injected so the branches are unit-testable without a DOM.
 */

export interface ClipboardDeps {
  readonly clipboard?: {
    writeText: (text: string) => Promise<void>;
  } | null;
  readonly createTextarea?: (() => {
    value: string;
    select: () => void;
    remove: () => void;
  }) | null;
  readonly execCopy?: (() => boolean) | null;
}

const browserClipboard = (): ClipboardDeps['clipboard'] => {
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    return navigator.clipboard;
  }

  return null;
};

const browserTextareaFactory = (): ClipboardDeps['createTextarea'] => {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }

  return () => document.createElement('textarea');
};

const browserExecCopy = (): ClipboardDeps['execCopy'] => {
  if (
    typeof document === 'undefined' ||
    typeof document.execCommand !== 'function'
  ) {
    return null;
  }

  return () => document.execCommand('copy');
};

export const copyTextToClipboard = async (
  text: string,
  deps: ClipboardDeps = {},
): Promise<boolean> => {
  const clipboard = deps.clipboard !== undefined ? deps.clipboard : browserClipboard();

  if (clipboard) {
    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy path.
    }
  }

  const createTextarea =
    deps.createTextarea !== undefined ? deps.createTextarea : browserTextareaFactory();
  const execCopy =
    deps.execCopy !== undefined ? deps.execCopy : browserExecCopy();

  if (!createTextarea || !execCopy) {
    return false;
  }

  try {
    const textarea = createTextarea();
    textarea.value = text;
    textarea.select();
    return execCopy();
  } catch {
    return false;
  }
};