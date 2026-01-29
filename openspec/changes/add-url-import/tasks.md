## 1. Data + API
- [x] 1.1 Add `source_url` field to book processing jobs (migration/SQL as applicable).
- [x] 1.2 Extend books service with `createRemoteBookFromUrl({ url, title, language })`.

## 2. Worker (URL extraction)
- [x] 2.1 Add URL validation + SSRF guardrails (http/https only, block private/loopback/link-local).
- [x] 2.2 Implement `worker/src/article.js` to fetch HTML with size/time limits and extract main text via Readability.
- [x] 2.3 Emit processed manifest compatible with EPUB flow (single chapter).
- [x] 2.4 Update job processing to handle `source_url` jobs and set processing status/errors.

## 3. Frontend UI
- [x] 3.1 Add URL import entry (button + modal form).
- [x] 3.2 Reuse language selection modal for URL import.
- [x] 3.3 Add error handling and user messaging for invalid/failed extraction.

## 4. Validation
- [ ] 4.1 Manual test: valid URL imports successfully and opens in reader.
- [ ] 4.2 Manual test: invalid/blocked URL yields a clear error and no book saved.
