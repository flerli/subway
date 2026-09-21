/**
 * Markdown → speakable text + sentence chunking (SW-REQ-013-02).
 *
 * Contract: `stripMarkdownToSpeech` removes everything that must never be
 * read aloud (code fences, inline code, tables, links/tool-event blocks,
 * heading artifacts) and returns clean prose; `chunkForSpeech` splits into
 * prosody-stable 2–5 sentence units (tech doc §4.7: "keep chapters to 2–5
 * spoken sentences for stable prosody and retry granularity").
 *
 * Why pure functions: the strip/chunk behavior is deterministic and fully
 * unit-testable without a DOM; the playback hook composes them.
 */

const FENCED_BLOCK = /^```[^\n]*\n[\s\S]*?^```[ \t]*\n?/gm
const TABLE_ROW = /^\s*\|.*\|?\s*$/gm
const SEPARATOR_ROW = /^\s*\|?\s*:?-{2,}.*\|?\s*$/gm
const INLINE_CODE = /`([^`]*)`/g
const HEADING = /^#{1,6}\s+/gm
const LINK = /\[([^\]]+)\]\(([^)]*)\)/g
const IMAGE = /!\[[^\]]*\]\([^)]*\)/g
const TASK_DONE = /^\s*-\s*\[x\]\s*/gim
const TASK_TODO = /^\s*-\s*\[\s\]\s*/gim
const BULLET = /^\s*[-*+]\s+/gm
const NUMBERED = /^\s*\d+[.)]\s+/gm
const BLOCKQUOTE = /^\s*>\s?/gm
const HORIZONTAL_RULE = /^\s*(?:---+|\*\*\*+|___+)\s*$/gm
const MULTI_WHITESPACE = /[ \t]{2,}/g
const MULTI_NEWLINE = /\n{3,}/g

/** Convert markdown into plain speech prose (empty input → empty string). */
export const stripMarkdownToSpeech = (markdown: string): string => {
  let text = String(markdown ?? '')

  // Code blocks: remove the ENTIRE fenced region, including its content.
  text = text.replace(FENCED_BLOCK, ' ')
  // Tables: drop separator rows and reformat the rest as space-joined cells.
  text = text.replace(SEPARATOR_ROW, ' ')
  text = text.replace(TABLE_ROW, (row) => {
    const cells = row
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0)

    return cells.join('. ')
  })
  // Links keep their visible text; images are dropped entirely.
  text = text.replace(IMAGE, ' ')
  text = text.replace(LINK, '$1')
  // Inline code becomes its content (rarely ideal, but readable).
  text = text.replace(INLINE_CODE, '$1')
  // Structural characters.
  text = text.replace(HEADING, '')
  text = text.replace(TASK_DONE, 'Done. ')
  text = text.replace(TASK_TODO, '')
  text = text.replace(BULLET, '')
  text = text.replace(NUMBERED, '')
  text = text.replace(BLOCKQUOTE, '')
  text = text.replace(HORIZONTAL_RULE, ' ')

  return text
    .replace(MULTI_WHITESPACE, ' ')
    .replace(MULTI_NEWLINE, '\n\n')
    .trim()
}

const SENTENCE_SPLIT =
  /(?<=[.!?…])\s+(?=[A-ZÄÖÜÀ-ÖØ-Þ«"'„“])|(?<=[.!?…])\s+(?=\n)/g
const MAX_CHUNK_SENTENCES = 5
const MIN_CHUNK_SENTENCES = 2

/**
 * Split prose into 2–5 sentence chunks. Long sentences stay whole (a single
 * sentence never splits mid-sentence); final chunk may be shorter than 2.
 */
export const chunkForSpeech = (speech: string): string[] => {
  const normalized = String(speech ?? '').replace(MULTI_WHITESPACE, ' ').trim()

  if (!normalized) {
    return []
  }

  const sentences = normalized.split(SENTENCE_SPLIT).map((sentence) => sentence.trim()).filter(Boolean)

  if (sentences.length <= MAX_CHUNK_SENTENCES) {
    return [sentences.join(' ')]
  }

  const chunks: string[] = []
  let current: string[] = []

  for (const sentence of sentences) {
    current.push(sentence)

    if (current.length >= MAX_CHUNK_SENTENCES) {
      chunks.push(current.join(' '))
      current = []
    }
  }

  if (current.length > 0) {
    if (chunks.length > 0 && current.length < MIN_CHUNK_SENTENCES) {
      const previous = chunks[chunks.length - 1]
      chunks[chunks.length - 1] = `${previous} ${current.join(' ')}`
    } else {
      chunks.push(current.join(' '))
    }
  }

  return chunks
}