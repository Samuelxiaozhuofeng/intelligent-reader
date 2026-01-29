/**
 * Compute a stable FNV-1a 32-bit hash for a Blob/File.
 * Used to create a deterministic bookId without parsing EPUB content.
 * @param {Blob} blob
 * @returns {Promise<string>} hex hash (8 chars)
 */
export async function fnv1a32HexFromBlob(blob) {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Compute a stable FNV-1a 32-bit hash for a string.
 * @param {string} value
 * @returns {string} hex hash (8 chars)
 */
export function fnv1a32HexFromString(value) {
  const str = String(value || '');
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function computeBookIdFromFile(file) {
  const hex = await fnv1a32HexFromBlob(file);
  return `book-${hex}`;
}

/**
 * @param {string} url
 * @returns {string}
 */
export function computeBookIdFromUrl(url) {
  const hex = fnv1a32HexFromString(String(url || '').trim());
  return `url-${hex}`;
}
