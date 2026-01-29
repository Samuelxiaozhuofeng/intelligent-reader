## Context
The app currently supports EPUB upload and cloud processing. Users request importing content by pasting a URL, then extracting the main text into a book entry.

## Goals / Non-Goals
- Goals:
  - Support URL import with a similar processing flow to EPUB.
  - Extract main article text reliably for static HTML pages.
  - Keep UI and storage consistent with existing book/manifest format.
- Non-Goals:
  - No headless browser rendering for JS-heavy pages in the initial version.
  - No long-term storage of source URLs in book records.

## Decisions
- Decision: Process URL extraction in the worker service.
  - Why: avoids CORS issues and keeps parsing consistent across clients.
- Decision: Use Readability (via JSDOM) for article extraction.
  - Why: proven baseline for main-content extraction with minimal dependency cost.
- Decision: Add `source_url` to processing jobs only (not to books table).
  - Why: satisfies processing needs without persisting potentially sensitive URLs.
- Decision: Enforce guardrails (protocol allowlist, IP blocklist, size/time limits).
  - Why: reduce SSRF risk and resource exhaustion.

## Risks / Trade-offs
- Dynamic pages may fail extraction without headless rendering.
- Strict SSRF rules can block some legitimate URLs (trade-off for safety).
- Readability may misidentify content on some sites; surface clear extraction errors.

## Migration Plan
- Add `source_url` to processing jobs schema (migration or SQL update).
- Deploy worker change before enabling the UI entry point.

## Open Questions
- None for initial implementation.
