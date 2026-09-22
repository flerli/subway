import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { copyTextToClipboard } from '../voiceClipboard.ts';

describe('copyTextToClipboard', () => {
  it('uses the async Clipboard API when available (positive)', async () => {
    const written: string[] = [];
    const ok = await copyTextToClipboard('hello', {
      clipboard: {
        writeText: async (text: string) => {
          written.push(text);
        },
      },
    });
    assert.equal(ok, true);
    assert.deepEqual(written, ['hello']);
  });

  it('falls back to the textarea path when the Clipboard API rejects (positive)', async () => {
    const used: { value: string; selected: boolean; removed: boolean } = {
      value: '',
      selected: false,
      removed: false,
    };
    let execCalls = 0;
    const ok = await copyTextToClipboard('fallback text', {
      clipboard: {
        writeText: async () => {
          throw new Error('denied');
        },
      },
      createTextarea: () => ({
        get value() {
          return used.value;
        },
        set value(next: string) {
          used.value = next;
        },
        select: () => {
          used.selected = true;
        },
        remove: () => {
          used.removed = true;
        },
      }),
      execCopy: () => {
        execCalls += 1;
        return true;
      },
    });
    assert.equal(ok, true);
    assert.equal(used.value, 'fallback text');
    assert.equal(used.selected, true);
    assert.equal(execCalls, 1);
  });

  it('returns false when no copy mechanism exists (negative)', async () => {
    const ok = await copyTextToClipboard('x', {
      clipboard: null,
      createTextarea: null,
      execCopy: null,
    });
    assert.equal(ok, false);
  });
});
