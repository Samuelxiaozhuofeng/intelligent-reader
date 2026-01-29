import { getBook, saveBook } from '../db.js';
import { clearCacheForBook } from '../views/reader/pagination-cache.js';
import { parseEpub } from '../epub-parser.js';
import { showNotification } from '../ui/notifications.js';
import { getSupabaseClient, isSupabaseConfigured } from './client.js';
import { downloadEPUB } from './epub-service.js';
import { getSessionUser } from './session.js';
import { downloadProcessedManifest } from './processed-books-service.js';
import { sanitizeHtml } from '../utils/sanitize.js';
import { upsertBookProcessingJob } from './book-processing-jobs.js';
import { computeBookIdFromUrl } from '../utils/file-hash.js';

function requireClient() {
  if (!isSupabaseConfigured()) throw new Error('Supabase 未配置');
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client unavailable');
  return client;
}

function requireUser(user) {
  if (!user?.id) throw new Error('请先登录以启用云端同步');
  return user;
}

function normalizeImportUrl(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) throw new Error('Missing url');
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    throw new Error('链接格式不正确');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('仅支持 http/https 链接');
  }
  return parsed.toString();
}

function mapRemoteBook(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title || '',
    cover: row.cover || null,
    language: row.language || 'en',
    chapterCount: typeof row.chapter_count === 'number' ? row.chapter_count : Number(row.chapter_count || 0),
    addedAt: row.created_at || row.added_at || row.updated_at || null,
    lastReadAt: row.last_read_at || row.updated_at || null,
    currentChapter: typeof row.current_chapter === 'number' ? row.current_chapter : Number(row.current_chapter || 0),
    storagePath: row.storage_path || null,
    storageUpdatedAt: row.file_updated_at || row.updated_at || null,
    processedPath: row.processed_path || null,
    processingStatus: row.processing_status || null,
    processingProgress: typeof row.processing_progress === 'number' ? row.processing_progress : Number(row.processing_progress || 0),
    processingStage: row.processing_stage || null,
    processingError: row.processing_error || null
  };
}

export async function getRemoteBookById(bookId) {
  const supabase = requireClient();
  const user = requireUser(await getSessionUser());

  const id = String(bookId || '').trim();
  if (!id) return null;

  const { data, error } = await supabase.from('books').select('*').eq('user_id', user.id).eq('id', id).maybeSingle();
  if (error) throw error;
  return mapRemoteBook(data);
}

export async function updateRemoteBook(bookId, updates) {
  const supabase = requireClient();
  const user = requireUser(await getSessionUser());

  const id = String(bookId || '').trim();
  if (!id) throw new Error('Missing bookId');

  /** @type {any} */
  const patch = {};
  if (typeof updates?.title === 'string') patch.title = updates.title.trim();
  if (typeof updates?.lastReadAt === 'string') patch.last_read_at = updates.lastReadAt;
  if (typeof updates?.currentChapter === 'number') patch.current_chapter = updates.currentChapter;
  if (typeof updates?.chapterCount === 'number') patch.chapter_count = updates.chapterCount;
  if (typeof updates?.language === 'string') patch.language = updates.language.trim();
  if (typeof updates?.cover === 'string' || updates?.cover === null) patch.cover = updates.cover;

  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from('books').update(patch).eq('user_id', user.id).eq('id', id).select('*').single();
  if (error) throw error;
  void clearCacheForBook(id);
  return mapRemoteBook(data);
}

export async function createRemoteBookFromUrl({ url, title, language }) {
  const supabase = requireClient();
  const user = requireUser(await getSessionUser());

  const normalizedUrl = normalizeImportUrl(url);
  const lang = String(language || 'en').trim() || 'en';
  const bookId = computeBookIdFromUrl(normalizedUrl);

  const nowIso = new Date().toISOString();
  const safeTitle = String(title || '').trim() || new URL(normalizedUrl).hostname || '未命名链接';
  const storagePath = `${user.id}/${bookId}/source.url`;

  const record = {
    user_id: user.id,
    id: bookId,
    title: safeTitle,
    cover: null,
    language: lang,
    chapter_count: null,
    storage_path: storagePath,
    processed_path: null,
    file_size: null,
    file_updated_at: nowIso,
    processing_status: 'queued',
    processing_progress: 0,
    processing_stage: 'queued',
    processing_error: null,
    updated_at: nowIso
  };

  const { data, error } = await supabase
    .from('books')
    .upsert(record, { onConflict: 'user_id,id' })
    .select('*')
    .single();
  if (error) throw error;

  await upsertBookProcessingJob({ bookId, language: lang, sourceUrl: normalizedUrl });
  return mapRemoteBook(data);
}

/**
 * Ensure a book is cached locally in IndexedDB (parsed chapters).
 * Downloads EPUB from Supabase Storage if missing locally.
 * @param {string} bookId
 * @returns {Promise<any|null>}
 */
export async function ensureLocalBookCached(bookId) {
  const id = String(bookId || '').trim();
  if (!id) return null;

  const existing = await getBook(id);
  const hasChapters = Array.isArray(existing?.chapters) && existing.chapters.length > 0;
  if (existing && hasChapters) return existing;

  const remote = await getRemoteBookById(id);
  if (!remote) throw new Error('云端书籍未找到');

  const processingStatus = String(remote.processingStatus || 'ready');
  if (processingStatus !== 'ready') {
    const progress = Number(remote.processingProgress) || 0;
    const stage = remote.processingStage ? `（${remote.processingStage}）` : '';
    if (processingStatus === 'error') {
      throw new Error(`云端处理失败${stage}: ${remote.processingError || 'unknown error'}`);
    }
    if (processingStatus === 'cancelled') {
      throw new Error('云端处理已取消');
    }
    throw new Error(`书籍正在云端处理中${stage}... ${progress}%`);
  }

  if (remote.processedPath) {
    const manifest = await downloadProcessedManifest(remote.processedPath, { bookId: id });
    const chapters = Array.isArray(manifest?.chapters) ? manifest.chapters : [];
    if (!chapters.length) throw new Error('Processed manifest missing chapters');

    await saveBook({
      id,
      title: remote.title || manifest.title || '',
      cover: remote.cover || manifest.cover || null,
      chapters: chapters.map((ch) => ({
        id: ch.id,
        title: ch.title || '',
        content: ch.content || '',
        rawHtml: sanitizeHtml(typeof ch.rawHtml === 'string' ? ch.rawHtml : ''),
        textHash: ch.textHash || null,
        tokensPath: ch.tokensPath || null
      })),
      chapterCount: chapters.length,
      currentChapter: remote.currentChapter || 0,
      addedAt: remote.addedAt || new Date().toISOString(),
      lastReadAt: remote.lastReadAt || new Date().toISOString(),
      language: remote.language || manifest.language || 'en',
      storagePath: remote.storagePath,
      storageUpdatedAt: remote.storageUpdatedAt || new Date().toISOString(),
      processedPath: remote.processedPath,
      processingStatus: 'ready',
      processingProgress: 100
    });

    void clearCacheForBook(id);
    showNotification('已从云端下载处理结果并缓存到本地', 'success');
    return getBook(id);
  }

  if (!remote?.storagePath) throw new Error('云端书籍缺少 storage_path');

  if (typeof window !== 'undefined' && typeof window.JSZip === 'undefined') {
    throw new Error('JSZip 未加载（请确保网络可访问 CDN，或将 JSZip 放到本地引用）');
  }

  const blob = await downloadEPUB(remote.storagePath, { expectedUpdatedAt: remote.storageUpdatedAt || null });
  const file = new File([blob], `${id}.epub`, { type: 'application/epub+zip' });

  const parsed = await parseEpub(file);

  await saveBook({
    id,
    title: remote.title || parsed.title,
    cover: remote.cover || parsed.cover,
    chapters: parsed.chapters,
    chapterCount: parsed.chapters.length,
    currentChapter: remote.currentChapter || 0,
    addedAt: remote.addedAt || new Date().toISOString(),
    lastReadAt: remote.lastReadAt || new Date().toISOString(),
    language: remote.language || 'en',
    storagePath: remote.storagePath,
    storageUpdatedAt: remote.storageUpdatedAt || new Date().toISOString()
  });

  void clearCacheForBook(id);
  showNotification('已从云端下载并缓存到本地', 'success');
  return getBook(id);
}
