import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { getConfig } from './config.js';
import { extractArticleFromUrl } from './article.js';
import { extractChaptersByToc, extractChaptersFromSpine, extractCoverDataUrl, extractTocEntries, loadEpubFromBuffer } from './epub.js';
import { tokenizeJapaneseCanonicalText } from './japanese.js';
import { gzipJson } from './storage.js';
import { fnv1a32HexFromString } from './text.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function createSupabase(config) {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Ensure PostgREST sees the JWT role as service_role for server-side RPC checks.
      headers: { Authorization: `Bearer ${config.supabaseServiceRoleKey}` },
      fetch: (url, options = {}) => {
        // Increase timeout to 60 seconds for large EPUB downloads
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(60000)
        });
      }
    }
  });
}

async function rpc(ctx, name, params) {
  const { data, error } = await ctx.supabase.rpc(name, params);
  if (error) throw error;
  return data;
}

async function updateJob(ctx, jobId, patch) {
  await rpc(ctx, 'update_book_processing_job', {
    job_id: jobId,
    new_status: patch.status ?? null,
    new_progress: typeof patch.progress === 'number' ? patch.progress : null,
    new_stage: patch.stage ?? null,
    new_error: patch.error ?? null,
    new_processed_path: patch.processedPath ?? null
  });
}

async function updateBookFields(ctx, userId, bookId, patch) {
  await rpc(ctx, 'update_book_processing_fields', {
    target_user_id: userId,
    target_book_id: bookId,
    new_status: patch.status ?? null,
    new_progress: typeof patch.progress === 'number' ? patch.progress : null,
    new_stage: patch.stage ?? null,
    new_error: patch.error ?? null,
    new_processed_path: patch.processedPath ?? null,
    did_delete_source: Boolean(patch.didDeleteSource)
  });
}

async function downloadStorageObject(ctx, path) {
  const { data, error } = await ctx.supabase.storage.from(ctx.config.bucket).download(path);
  if (error) throw error;
  if (!data) throw new Error('Storage download returned empty body');
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadStorageObject(ctx, path, buffer, contentType) {
  const body = buffer instanceof Blob
    ? buffer
    : new Blob([buffer], { type: contentType || 'application/octet-stream' });
  const { error } = await ctx.supabase.storage.from(ctx.config.bucket).upload(path, body, {
    upsert: true,
    contentType: contentType || 'application/octet-stream',
    cacheControl: '3600'
  });
  if (error) throw error;
}

async function deleteStorageObject(ctx, path) {
  const { error } = await ctx.supabase.storage.from(ctx.config.bucket).remove([path]);
  if (error) throw error;
}

async function setBookMetadata(ctx, userId, bookId, patch) {
  const { error } = await ctx.supabase
    .from('books')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', bookId);
  if (error) throw error;
}

async function processEpubJob(ctx, job) {
  const jobId = job.id;
  const userId = job.user_id;
  const bookId = job.book_id;
  const language = (job.language || 'en').toString().trim().toLowerCase();
  const sourcePath = job.source_path;
  if (!sourcePath) throw new Error('Missing source_path');

  const processedManifestPath = `${userId}/${bookId}/processed/manifest.json.gz`;

  const stage = async (progress, stageName) => {
    await updateJob(ctx, jobId, { status: 'processing', progress, stage: stageName, error: null, processedPath: processedManifestPath });
    await updateBookFields(ctx, userId, bookId, { status: 'processing', progress, stage: stageName, error: null, processedPath: processedManifestPath });
  };

  try {
    await stage(2, 'download-source');
    const epubBuffer = await downloadStorageObject(ctx, sourcePath);

    await stage(8, 'parse-epub');
    const loaded = await loadEpubFromBuffer(epubBuffer);
    const cover = await extractCoverDataUrl(loaded).catch(() => null);

    await stage(15, 'read-toc');
    const toc = await extractTocEntries(loaded);
    let chapters = await extractChaptersByToc({ zip: loaded.zip, baseDir: toc.baseDir || loaded.opfDir, tocEntries: toc.entries });
    if (!chapters.length) {
      await stage(18, `toc-empty:${toc.kind}:${toc.entries?.length || 0};fallback-spine`);
      chapters = await extractChaptersFromSpine({
        zip: loaded.zip,
        opfDir: loaded.opfDir,
        manifestItems: loaded.manifestItems,
        spineIdrefs: loaded.spineIdrefs
      });
    }
    if (!chapters.length) {
      throw new Error(`No chapters extracted (toc=${toc.kind}, tocEntries=${toc.entries?.length || 0})`);
    }

    await stage(language === 'ja' ? 30 : 65, language === 'ja' ? 'tokenize-ja' : 'build-manifest');

    const manifest = {
      version: '1',
      bookId,
      title: (loaded.title || '').trim(),
      language,
      cover: cover || null,
      tocKind: toc.kind,
      chapters: []
    };

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      const chapterEntry = {
        id: ch.id,
        title: ch.title,
        content: ch.content,
        rawHtml: ch.rawHtml
      };

      if (language === 'ja') {
        const chStartTime = Date.now();
        const chapterSize = Buffer.byteLength(ch.content, 'utf8');
        console.log(`[worker] tokenizing chapter ${i + 1}/${chapters.length} (${ch.id}, ${Math.round(chapterSize / 1024)}KB)`);

        const tokenized = await tokenizeJapaneseCanonicalText(ch.content);

        const chDuration = Math.round((Date.now() - chStartTime) / 1000);
        console.log(`[worker] chapter ${i + 1}/${chapters.length} done (${tokenized.tokens.length} tokens, ${chDuration}s)`);

        const tokensPath = `${userId}/${bookId}/processed/tokens/${ch.id}.json.gz`;
        const tokenPayload = {
          version: '1',
          bookId,
          chapterId: ch.id,
          textHash: tokenized.textHash,
          tokenizer: tokenized.tokenizer,
          tokens: tokenized.tokens
        };
        await uploadStorageObject(ctx, tokensPath, gzipJson(tokenPayload), 'application/gzip');
        chapterEntry.textHash = tokenized.textHash;
        chapterEntry.tokensPath = tokensPath;

        const progress = Math.min(90, 30 + Math.round(((i + 1) / chapters.length) * 55));
        await stage(progress, `tokenize-ja:${i + 1}/${chapters.length}`);
      }

      manifest.chapters.push(chapterEntry);
    }

    await stage(92, 'upload-manifest');
    await uploadStorageObject(ctx, processedManifestPath, gzipJson(manifest), 'application/gzip');

    await stage(96, 'delete-source');
    await deleteStorageObject(ctx, sourcePath);

    await stage(98, 'finalize');
    await setBookMetadata(ctx, userId, bookId, {
      title: manifest.title || `Book ${bookId}`,
      cover: manifest.cover,
      chapter_count: manifest.chapters.length,
      processed_path: processedManifestPath,
      processing_status: 'ready',
      processing_progress: 100,
      processing_stage: 'done',
      processing_error: null,
      processed_at: new Date().toISOString(),
      source_deleted_at: new Date().toISOString()
    });

    await updateJob(ctx, jobId, { status: 'done', progress: 100, stage: 'done', error: null, processedPath: processedManifestPath });
    await updateBookFields(ctx, userId, bookId, { status: 'ready', progress: 100, stage: 'done', error: null, processedPath: processedManifestPath, didDeleteSource: true });
  } catch (error) {
    const message = error?.message || String(error);
    await updateJob(ctx, jobId, { status: 'error', progress: job.progress || 0, stage: 'error', error: message, processedPath: processedManifestPath }).catch(() => { });
    await updateBookFields(ctx, userId, bookId, { status: 'error', progress: job.progress || 0, stage: 'error', error: message, processedPath: processedManifestPath }).catch(() => { });
    throw error;
  }
}

async function processUrlJob(ctx, job) {
  const jobId = job.id;
  const userId = job.user_id;
  const bookId = job.book_id;
  const language = (job.language || 'en').toString().trim().toLowerCase();
  const sourceUrl = String(job.source_url || '').trim();

  if (!sourceUrl) throw new Error('Missing source_url');

  const processedManifestPath = `${userId}/${bookId}/processed/manifest.json.gz`;

  const stage = async (progress, stageName) => {
    await updateJob(ctx, jobId, { status: 'processing', progress, stage: stageName, error: null, processedPath: processedManifestPath });
    await updateBookFields(ctx, userId, bookId, { status: 'processing', progress, stage: stageName, error: null, processedPath: processedManifestPath });
  };

  try {
    await stage(6, 'validate-url');
    const article = await extractArticleFromUrl(sourceUrl, {
      timeoutMs: ctx.config.urlFetchTimeoutMs,
      maxBytes: ctx.config.urlMaxBytes,
      userAgent: ctx.config.urlUserAgent
    });

    await stage(language === 'ja' ? 30 : 70, language === 'ja' ? 'tokenize-ja' : 'build-manifest');

    const chapterId = `url-${fnv1a32HexFromString(sourceUrl)}`;
    const manifest = {
      version: '1',
      bookId,
      title: (article.title || '').trim(),
      language,
      cover: null,
      tocKind: 'url',
      chapters: []
    };

    const chapterEntry = {
      id: chapterId,
      title: article.title || 'Untitled',
      content: article.content || '',
      rawHtml: article.rawHtml || ''
    };

    if (language === 'ja') {
      const tokenized = await tokenizeJapaneseCanonicalText(chapterEntry.content);
      const tokensPath = `${userId}/${bookId}/processed/tokens/${chapterId}.json.gz`;
      const tokenPayload = {
        version: '1',
        bookId,
        chapterId: chapterEntry.id,
        textHash: tokenized.textHash,
        tokenizer: tokenized.tokenizer,
        tokens: tokenized.tokens
      };
      await uploadStorageObject(ctx, tokensPath, gzipJson(tokenPayload), 'application/gzip');
      chapterEntry.textHash = tokenized.textHash;
      chapterEntry.tokensPath = tokensPath;
    }

    manifest.chapters.push(chapterEntry);

    await stage(92, 'upload-manifest');
    await uploadStorageObject(ctx, processedManifestPath, gzipJson(manifest), 'application/gzip');

    await stage(98, 'finalize');
    /** @type {any} */
    const metadataPatch = {
      cover: null,
      chapter_count: manifest.chapters.length,
      processed_path: processedManifestPath,
      processing_status: 'ready',
      processing_progress: 100,
      processing_stage: 'done',
      processing_error: null,
      processed_at: new Date().toISOString()
    };
    if (manifest.title) metadataPatch.title = manifest.title;

    await setBookMetadata(ctx, userId, bookId, metadataPatch);

    await updateJob(ctx, jobId, { status: 'done', progress: 100, stage: 'done', error: null, processedPath: processedManifestPath });
    await updateBookFields(ctx, userId, bookId, { status: 'ready', progress: 100, stage: 'done', error: null, processedPath: processedManifestPath, didDeleteSource: false });
  } catch (error) {
    const message = error?.message || String(error);
    await updateJob(ctx, jobId, { status: 'error', progress: job.progress || 0, stage: 'error', error: message, processedPath: processedManifestPath }).catch(() => { });
    await updateBookFields(ctx, userId, bookId, { status: 'error', progress: job.progress || 0, stage: 'error', error: message, processedPath: processedManifestPath }).catch(() => { });
    throw error;
  }
}

async function processJob(ctx, job) {
  if (job?.source_url) {
    await processUrlJob(ctx, job);
    return;
  }
  await processEpubJob(ctx, job);
}

async function claimOneJob(ctx) {
  const claimed = await rpc(ctx, 'claim_book_processing_job', {
    worker_id: ctx.config.workerId,
    lock_minutes: 15,
    max_attempts: ctx.config.maxAttempts
  });

  const job = Array.isArray(claimed) ? claimed[0] : claimed;
  return job?.id ? job : null;
}

async function runLoopWorker(ctx) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const job = await claimOneJob(ctx);
      if (!job) {
        await sleep(ctx.config.pollIntervalMs);
        continue;
      }

      console.log(`[worker] claimed`, { jobId: job.id, bookId: job.book_id, language: job.language, attempts: job.attempts });
      await processJob(ctx, job);
      console.log(`[worker] done`, { jobId: job.id, bookId: job.book_id });
    } catch (error) {
      console.error('[worker] loop error', error);
      await sleep(Math.max(2000, ctx.config.pollIntervalMs));
    }
  }
}

async function runJobWorker(ctx) {
  const maxJobs = Math.max(1, Number(ctx.config.maxJobs) || 1);
  let processed = 0;

  while (processed < maxJobs) {
    const job = await claimOneJob(ctx);
    if (!job) {
      console.log('[worker] no jobs available; exiting', { processed, maxJobs });
      return;
    }

    console.log(`[worker] claimed`, { jobId: job.id, bookId: job.book_id, language: job.language, attempts: job.attempts });
    await processJob(ctx, job);
    console.log(`[worker] done`, { jobId: job.id, bookId: job.book_id });
    processed += 1;
  }

  console.log('[worker] reached max jobs; exiting', { processed, maxJobs });
}

export async function main() {
  const config = getConfig();
  const supabase = createSupabase(config);
  const ctx = { config, supabase };

  console.log('[worker] starting', { workerId: config.workerId, bucket: config.bucket, mode: config.workerMode });
  if (config.workerMode === 'job') {
    await runJobWorker(ctx);
    return;
  }
  await runLoopWorker(ctx);
}

const isEntrypoint = (() => {
  try {
    const entry = process.argv[1];
    if (!entry) return false;
    return pathToFileURL(path.resolve(entry)).href === import.meta.url;
  } catch {
    return false;
  }
})();

if (isEntrypoint) {
  await main();
}
