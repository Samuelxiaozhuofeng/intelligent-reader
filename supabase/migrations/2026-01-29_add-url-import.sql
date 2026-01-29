-- Add URL import support for book processing jobs

alter table public.book_processing_jobs
  add column if not exists source_url text null;

alter table public.book_processing_jobs
  alter column source_path drop not null;

alter table public.book_processing_jobs
  drop constraint if exists book_processing_jobs_source_check;

alter table public.book_processing_jobs
  add constraint book_processing_jobs_source_check check (
    (source_path is not null and source_url is null)
    or
    (source_path is null and source_url is not null)
  );

drop function if exists public.claim_book_processing_job(text, integer, integer);

create or replace function public.claim_book_processing_job(worker_id text, lock_minutes integer default 15, max_attempts integer default 5)
returns table (
  id uuid,
  user_id uuid,
  book_id text,
  language text,
  source_path text,
  source_url text,
  attempts integer
)
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform public._require_service_role();

  return query
  with candidate as (
    select j.id
    from public.book_processing_jobs j
    where j.status = 'queued'
      and j.attempts < max_attempts
      and (j.locked_at is null or j.locked_at < now() - (lock_minutes || ' minutes')::interval)
    order by j.updated_at asc
    for update skip locked
    limit 1
  )
  update public.book_processing_jobs j
  set status = 'processing',
      progress = 0,
      stage = 'claimed',
      error = null,
      locked_at = now(),
      locked_by = worker_id,
      attempts = j.attempts + 1,
      updated_at = now()
  from candidate
  where j.id = candidate.id
  returning j.id, j.user_id, j.book_id, j.language, j.source_path, j.source_url, j.attempts;
end;
$$;
