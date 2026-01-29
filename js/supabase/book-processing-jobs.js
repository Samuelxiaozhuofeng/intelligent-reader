import { getSupabaseClient, isSupabaseConfigured } from './client.js';
import { getSessionUser } from './session.js';

function requireClient() {
  if (!isSupabaseConfigured()) throw new Error('Supabase 未配置');
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client unavailable');
  return client;
}

function requireUser(user) {
  if (!user?.id) throw new Error('请先登录以启用云端处理');
  return user;
}

export async function upsertBookProcessingJob({ bookId, language, sourcePath, sourceUrl }) {
  const supabase = requireClient();
  const user = requireUser(await getSessionUser());

  const id = String(bookId || '').trim();
  if (!id) throw new Error('Missing bookId');
  const lang = String(language || 'en').trim() || 'en';
  const srcPath = String(sourcePath || '').trim();
  const srcUrl = String(sourceUrl || '').trim();
  const hasPath = Boolean(srcPath);
  const hasUrl = Boolean(srcUrl);
  if (hasPath === hasUrl) throw new Error('Provide exactly one of sourcePath or sourceUrl');

  const nowIso = new Date().toISOString();
  const row = {
    user_id: user.id,
    book_id: id,
    language: lang,
    status: 'queued',
    progress: 0,
    stage: 'queued',
    error: null,
    source_path: hasPath ? srcPath : null,
    source_url: hasUrl ? srcUrl : null,
    processed_path: null,
    updated_at: nowIso
  };

  const { data, error } = await supabase
    .from('book_processing_jobs')
    .upsert(row, { onConflict: 'user_id,book_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getBookProcessingJob(bookId) {
  const supabase = requireClient();
  const user = requireUser(await getSessionUser());
  const id = String(bookId || '').trim();
  if (!id) return null;

  const { data, error } = await supabase
    .from('book_processing_jobs')
    .select('*')
    .eq('user_id', user.id)
    .eq('book_id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function cancelBookProcessingJob(bookId) {
  const supabase = requireClient();
  const user = requireUser(await getSessionUser());
  const id = String(bookId || '').trim();
  if (!id) throw new Error('Missing bookId');

  const nowIso = new Date().toISOString();

  const { error: jobErr } = await supabase
    .from('book_processing_jobs')
    .update({ status: 'cancelled', stage: 'cancelled', updated_at: nowIso })
    .eq('user_id', user.id)
    .eq('book_id', id);
  if (jobErr) throw jobErr;

  const { error: bookErr } = await supabase
    .from('books')
    .update({ processing_status: 'cancelled', processing_stage: 'cancelled', updated_at: nowIso })
    .eq('user_id', user.id)
    .eq('id', id);
  if (bookErr) throw bookErr;

  return true;
}

export async function retryBookProcessingJob(bookId) {
  const supabase = requireClient();
  const user = requireUser(await getSessionUser());
  const id = String(bookId || '').trim();
  if (!id) throw new Error('Missing bookId');

  const nowIso = new Date().toISOString();

  const { error: jobErr } = await supabase
    .from('book_processing_jobs')
    .update({ status: 'queued', progress: 0, stage: 'retry', error: null, updated_at: nowIso })
    .eq('user_id', user.id)
    .eq('book_id', id);
  if (jobErr) throw jobErr;

  const { error: bookErr } = await supabase
    .from('books')
    .update({ processing_status: 'queued', processing_progress: 0, processing_stage: 'retry', processing_error: null, updated_at: nowIso })
    .eq('user_id', user.id)
    .eq('id', id);
  if (bookErr) throw bookErr;

  return true;
}

export async function waitForBookProcessingJob(bookId, { onUpdate = null, timeoutMs = 15 * 60 * 1000 } = {}) {
  const startedAt = Date.now();
  const poll = async () => {
    const job = await getBookProcessingJob(bookId);
    if (typeof onUpdate === 'function') {
      try {
        onUpdate(job);
      } catch {
        // ignore
      }
    }
    return job;
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = await poll();
    const status = String(job?.status || '');
    if (status === 'done') return { ok: true, job };
    if (status === 'error') return { ok: false, job, error: new Error(job?.error || 'Processing failed') };
    if (status === 'cancelled') return { ok: false, job, error: new Error('Processing cancelled') };

    if (Date.now() - startedAt > timeoutMs) {
      return { ok: false, job, error: new Error('Processing timeout') };
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
}
