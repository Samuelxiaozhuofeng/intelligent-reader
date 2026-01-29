# Change: Add URL import for article extraction

## Why
Users want to paste a link and have the app parse it and extract the main text, similar to importing an EPUB.

## What Changes
- Add a URL import entry point on the bookshelf UI (paste link + optional title + language).
- Queue a cloud processing job using a `source_url` payload, parsed by the worker.
- Extract main article text server-side and store it in the same processed manifest format as EPUB.
- Add basic URL validation, SSRF protections, and size/time limits.
- **Non-goal:** no headless browser rendering in the initial version.

## Impact
- Affected specs: reader-interface, multi-language
- Affected code: `index.html`, `js/views/bookshelf.js`, `js/supabase/books-service.js`, `worker/src/index.js`, `worker/src/article.js`
- Data: add `source_url` to processing jobs (schema/migration as applicable)
