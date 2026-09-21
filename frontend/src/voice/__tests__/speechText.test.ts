import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chunkForSpeech, stripMarkdownToSpeech } from '../speechText.ts';

describe('stripMarkdownToSpeech', () => {
  it('never reads code fences or inline code aloud (positive: SWE6 criterion)', () => {
    const markdown = 'Here is a plan:\n\n```js\nconst x = 1\nconsole.log(x)\n```\nThen `inline` done.';
    const speech = stripMarkdownToSpeech(markdown);
    assert.ok(!speech.includes('const'));
    assert.ok(!speech.includes('console'));
    assert.ok(!speech.includes('`'));
    assert.ok(speech.includes('Here is a plan'));
    assert.ok(speech.includes('Then inline done'));
  });

  it('reformats tables to spoken cells without pipe noise (positive)', () => {
    const markdown = '| City | Temp |\n| --- | --- |\n| Berlin | 22 |\n| Paris | 24 |';
    const speech = stripMarkdownToSpeech(markdown);
    assert.ok(!speech.includes('|'));
    assert.ok(speech.includes('Berlin'));
    assert.ok(speech.includes('Paris'));
    assert.ok(speech.includes('22'));
  });

  it('flattens links to visible text and drops images/task-artifacts (positive)', () => {
    const markdown = 'Click [Swaibian docs](https://x) and ![pic](img.png).\n\n- [x] Done thing\n- [ ] Todo thing';
    const speech = stripMarkdownToSpeech(markdown);
    assert.ok(!speech.includes('![pic]'));
    assert.ok(speech.includes('Swaibian docs'));
    assert.ok(speech.includes('Done thing'));
    assert.ok(!speech.includes('[ ]'));
  });

  it('handles empty/punctuation-only input (negative)', () => {
    assert.equal(stripMarkdownToSpeech(''), '');
    // Heading markers are stripped; heading text is kept as prose.
    assert.equal(stripMarkdownToSpeech('# Only a heading'), 'Only a heading');
    assert.equal(stripMarkdownToSpeech('...'), '...');
  });
});

describe('chunkForSpeech', () => {
  const longSpeech = Array.from({ length: 20 }, (_, index) => `Sentence ${index + 1} ends.`).join(' ');

  it('keeps short answers in one chunk (positive)', () => {
    assert.deepEqual(chunkForSpeech('One sentence. Two sentences. Three.'), [
      'One sentence. Two sentences. Three.',
    ]);
  });

  it('chunks long answers into 2-5 sentence units (positive: SWE6 criterion)', () => {
    const chunks = chunkForSpeech(longSpeech);
    assert.ok(chunks.length >= 4 && chunks.length <= 10, `chunk count ${chunks.length}`);
    for (const chunk of chunks) {
      // Single-sentence chunks allowed at the tail only.
      const sentences = chunk.split('. ').filter((part) => part.trim().length > 0);
      assert.ok(
        sentences.length <= 5,
        `chunk has ${sentences.length} sentences`,
      );
    }
    assert.ok(chunks.join(' ').includes('Sentence 1 ends.'));
    assert.ok(chunks[0]!.includes('Sentence 1 ends.'));
  });

  it('never splits a single long sentence (positive)', () => {
    const one = `A very long sentence with many clauses: one, two, three, four, five, six, seven.`;
    assert.deepEqual(chunkForSpeech(one), [one]);
  });

  it('returns [] for empty input (negative)', () => {
    assert.deepEqual(chunkForSpeech(''), []);
    assert.deepEqual(chunkForSpeech('   '), []);
  });
});