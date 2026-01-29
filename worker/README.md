# Worker: Cloud Book Processing

This service claims jobs from Supabase (`public.book_processing_jobs`) and produces processed reading artifacts:
- TOC-based chapter extraction (EPUB3 `nav.xhtml`, EPUB2 `toc.ncx`)
- Japanese (ja) SudachiPy tokenization with offsets aligned to frontend canonical text rules (SplitMode.C + sudachidict_core)
- URL article extraction via Readability (single-chapter manifest)
- Upload artifacts to Supabase Storage and delete the source EPUB on success

## Environment

Required:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

Optional:
- `SUPABASE_BUCKET` (default: `epubs`)
- `WORKER_ID` (default: `worker-<pid>`)
- `POLL_INTERVAL_MS` (default: `1500`)
- `MAX_ATTEMPTS` (default: `5`)
- `WORKER_MODE` (`loop` | `job`, default: `loop`)
- `MAX_JOBS` (job mode: max jobs per run, default: `1`)
- `URL_FETCH_TIMEOUT_MS` (default: `8000`)
- `URL_MAX_BYTES` (default: `8000000`)
- `URL_USER_AGENT` (default: `Mozilla/5.0 (compatible; IntelligentReader/1.0)`)

## Run locally

```bash
cd worker
npm install
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm start
```

## Cloud Run Jobs

For “run-to-completion” deployments (Cloud Run Jobs), set `WORKER_MODE=job` so the container exits when no work is available.

See `docs/CLOUD_RUN_JOBS.md`.

## Notes
- This worker assumes the SQL functions added in `supabase/schema.sql` exist in your Supabase project (`claim_book_processing_job`, `update_book_processing_job`, `update_book_processing_fields`).
- The worker uses the service role key and bypasses RLS for storage and table writes.
