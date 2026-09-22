#!/usr/bin/env node
/**
 * Stage the in-browser Whisper runtime for an offline kiosk.
 *
 * Why (SW-REQ-013-01 #4): transcription must never download at runtime. The
 * browser build of `@huggingface/transformers` cannot load a same-origin model
 * with `local_files_only`/`allowRemoteModels=false` (`env.allowLocalModels` is
 * always false in browsers), so the model files are staged into the built
 * frontend and the runtime is pointed at this origin (see `stt.ts`).
 *
 * Model selection (accuracy vs size, tech doc §1.2/§5):
 *   - `Xenova/whisper-small` (q8, ~237 MB)  — DEFAULT primary: materially
 *     better on accents/noise/proper nouns; the budgeted step-up from tiny.
 *   - `Xenova/whisper-tiny` (q8, ~69 MB)    — DEFAULT fallback, staged
 *     alongside: small can fail to initialize on memory-constrained kiosks
 *     or slow links, and the app transparently retries tiny (`stt.ts`
 *     `VOICE_STT_FALLBACK_MODEL_ID`). Override with `VOICE_STT_MODEL` /
 *     `VOICE_STT_FALLBACK_MODEL`.
 * `stt.ts` MUST match: `VOICE_STT_MODEL_ID` / `VOICE_STT_FALLBACK_MODEL_ID`.
 *
 * What it does:
 *   1. downloads the q8 file set from the model host (default
 *      https://huggingface.co, override with `VOICE_MODEL_HOST`) into
 *      `frontend/public/voice-models/<model-id>/`
 *   2. copies the ONNX-runtime WASM pair into
 *      `frontend/public/voice-models/ort/` (from node_modules — no download;
 *      without this, transformers.js fetches it from the jsDelivr CDN)
 *
 * Run from the frontend build (`npm run fetch:voice-models`) or directly:
 *   node scripts/fetch-voice-models.mjs [--force] [--check]
 *
 * Build-time network only. The kiosk browser then loads the model once from
 * the app origin and keeps it in the browser cache.
 */

import { createWriteStream } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const frontendDirectory = resolve(scriptDirectory, '..');
const modelRoot = join(frontendDirectory, 'public', 'voice-models');
const modelHost = (process.env.VOICE_MODEL_HOST ?? 'https://huggingface.co').replace(/\/+$/, '');
const primaryModelId = process.env.VOICE_STT_MODEL ?? 'Xenova/whisper-small';
const fallbackModelId = process.env.VOICE_STT_FALLBACK_MODEL ?? 'Xenova/whisper-tiny';
const modelIds = [...new Set([primaryModelId, fallbackModelId])];
const revision = 'main';

/** q8 (`_quantized`) file set Whisper needs plus the tokenizer metadata. */
const MODEL_FILES = [
  'config.json',
  'generation_config.json',
  'preprocessor_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'added_tokens.json',
  'merges.txt',
  'normalizer.json',
  'special_tokens_map.json',
  'vocab.json',
  'onnx/encoder_model_quantized.onnx',
  'onnx/decoder_model_merged_quantized.onnx',
];

/** ONNX runtime pair requested by transformers.js v4 by default (`.asyncify`). */
const ORT_FILES = [
  'ort-wasm-simd-threaded.asyncify.mjs',
  'ort-wasm-simd-threaded.asyncify.wasm',
];

const force = process.argv.includes('--force');
const checkOnly = process.argv.includes('--check');

const formatBytes = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/**
 * Expected SHA-256 per staged file, from the Hub metadata (LFS OIDs).
 * Guards against truncated/corrupt weights ever being baked into an image:
 * a mismatch fails the build loudly instead of shipping a model that dies
 * at load time on the kiosk (which then silently falls back to tiny).
 */
const fetchExpectedHashes = async () => {
  const hashes = new Map();

  for (const modelId of modelIds) {
    const url = `${modelHost}/api/models/${modelId}`;
    const response = await fetch(url, { redirect: 'follow' });

    if (!response.ok) {
      throw new Error(`GET ${url} -> HTTP ${response.status}`);
    }

    const metadata = await response.json();
    const siblings = Array.isArray(metadata?.siblings) ? metadata.siblings : [];

    for (const sibling of siblings) {
      const sha = sibling?.lfs?.sha256;
      if (typeof sibling?.rfilename === 'string' && typeof sha === 'string') {
        hashes.set(`${modelId}/${sibling.rfilename}`, sha);
      }
    }
  }

  return hashes;
};

const sha256File = async (path) => {
  const { createHash } = await import('node:crypto');
  const { createReadStream } = await import('node:fs');
  const hash = createHash('sha256');

  await new Promise((resolve, reject) => {
    const stream = createReadStream(path);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', resolve);
    stream.on('error', reject);
  });

  return hash.digest('hex');
};

const downloadVerified = async (url, target, expectedHash, fileName) => {
  const attempts = 3;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const size = await download(url, target);

    if (!expectedHash) {
      return size;
    }

    const actual = await sha256File(target);

    if (actual === expectedHash) {
      return size;
    }

    await rm(target, { force: true });
    console.warn(
      `[voice-models] sha256 mismatch for ${fileName} (attempt ${attempt}/${attempts}) — retrying`,
    );
  }

  throw new Error(`sha256 mismatch for ${fileName} after ${attempts} attempts`);
};

const fileSize = async (path) => {
  try {
    const info = await stat(path);
    return info.isFile() ? info.size : null;
  } catch {
    return null;
  }
};

/** Download one URL to `target` atomically (temp file + rename), with a size check. */
const download = async (url, target) => {
  const response = await fetch(url, { redirect: 'follow' });

  if (!response.ok) {
    throw new Error(`GET ${url} -> HTTP ${response.status}`);
  }

  const expected = Number(response.headers.get('content-length') ?? '0');
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.part`;
  await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary));

  const written = await fileSize(temporary);

  if (written === null || written === 0 || (expected > 0 && written !== expected)) {
    await rm(temporary, { force: true });
    throw new Error(`Incomplete download for ${target} (${written ?? 0}/${expected} bytes)`);
  }

  const { rename } = await import('node:fs/promises');
  await rename(temporary, target);

  return written;
};

const resolveOrtSource = async (fileName) => {
  const sourceDirectory = join(frontendDirectory, 'node_modules', 'onnxruntime-web', 'dist');
  const source = join(sourceDirectory, fileName);
  const size = await fileSize(source);

  if (size === null) {
    throw new Error(
      `Missing ${fileName} in ${sourceDirectory} — run "npm ci" in frontend/ first (onnxruntime-web is a transformers.js dependency).`,
    );
  }

  return size;
};

const verifyModelFile = async (target, fileName) => {
  if (fileName.endsWith('.json')) {
    JSON.parse(await readFile(target, 'utf8'));
  }
};

const main = async () => {
  console.log(`[voice-models] staging ${modelIds.join(' + ')} (q8) into ${modelRoot}`);

  // Best-effort: without metadata we still verify sizes/JSON, just not hashes.
  let expectedHashes = new Map();

  try {
    expectedHashes = await fetchExpectedHashes();
  } catch (error) {
    console.warn(
      `[voice-models] hub metadata unavailable, skipping sha256 checks: ${
        error instanceof Error ? error.message : error
      }`,
    );
  }

  let downloadedBytes = 0;
  const missing = [];

  if (checkOnly) {
    for (const modelId of modelIds) {
      for (const fileName of MODEL_FILES) {
        const size = await fileSize(join(modelRoot, modelId, fileName));
        if (size === null) {
          missing.push(`${modelId}/${fileName}`);
        }
      }
    }

    for (const fileName of ORT_FILES) {
      const size = await fileSize(join(modelRoot, 'ort', fileName));
      if (size === null) {
        missing.push(`ort/${fileName}`);
      }
    }

    if (missing.length > 0) {
      console.error(`[voice-models] not staged: ${missing.join(', ')}`);
      console.error('[voice-models] run: npm run fetch:voice-models');
      process.exit(1);
    }

    console.log('[voice-models] all files staged (offline-ready)');
    return;
  }

  for (const modelId of modelIds) {
    for (const fileName of MODEL_FILES) {
      const target = join(modelRoot, modelId, fileName);
      const existing = await fileSize(target);

      if (existing !== null && !force) {
        await verifyModelFile(target, fileName);
        console.log(`[voice-models] keep ${modelId}/${fileName} (${formatBytes(existing)})`);
        continue;
      }

      const url = `${modelHost}/${modelId}/resolve/${revision}/${fileName}`;
      const expectedHash = expectedHashes.get(`${modelId}/${fileName}`) ?? null;
      const size = await downloadVerified(url, target, expectedHash, `${modelId}/${fileName}`);
      await verifyModelFile(target, fileName);
      downloadedBytes += size;
      console.log(`[voice-models] ${modelId}/${fileName} (${formatBytes(size)})`);
    }
  }

  for (const fileName of ORT_FILES) {
    const source = join(frontendDirectory, 'node_modules', 'onnxruntime-web', 'dist', fileName);
    const target = join(modelRoot, 'ort', fileName);
    const expected = await resolveOrtSource(fileName);
    const existing = await fileSize(target);

    if (existing === expected && !force) {
      console.log(`[voice-models] keep ort/${fileName} (${formatBytes(existing)})`);
      continue;
    }

    await mkdir(dirname(target), { recursive: true });
    const temporary = `${target}.part`;
    await copyFile(source, temporary);
    await rename(temporary, target);
    downloadedBytes += expected;
    console.log(`[voice-models] ort/${fileName} (${formatBytes(expected)})`);
  }

  for (const modelId of modelIds) {
    const staged = await readdir(join(modelRoot, modelId));
    console.log(`[voice-models] done: ${modelId} (${staged.length} entries)`);
  }
  console.log(`[voice-models] +${formatBytes(downloadedBytes)} fetched/copied`);
  console.log('[voice-models] build now: npm run build (files land in dist/voice-models/)');
};

main().catch((error) => {
  console.error(`[voice-models] failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});