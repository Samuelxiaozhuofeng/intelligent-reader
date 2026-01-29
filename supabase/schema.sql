-- Supabase SQL Schema for Language Reader
-- Includes: books, progress, vocabulary + RLS + Storage bucket policies
--
-- Assumptions:
-- - Using Supabase Auth (auth.users)
-- - `vocabulary.kind` stores both book-level and global (FSRS) records

create extension if not exists pgcrypto;

-- ============================================
-- Tables
-- ============================================

create table if not exists public.books (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,

  title text not null,
  cover text null,
  language text not null default 'en',
  chapter_count integer null,
  current_chapter integer not null default 0,

  storage_path text not null,
  processed_path text null,
  file_size bigint null,
  file_updated_at timestamptz null,

  added_at timestamptz not null default now(),
  last_read_at timestamptz null,

  processing_status text not null default 'ready',
  processing_progress integer not null default 100,
  processing_stage text null,
  processing_error text null,
  processed_at timestamptz null,
  source_deleted_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id, id)
);

create index if not exists books_user_updated_idx on public.books (user_id, updated_at desc);
create index if not exists books_user_last_read_idx on public.books (user_id, last_read_at desc nulls last);
create index if not exists books_user_language_idx on public.books (user_id, language);
create index if not exists books_user_processing_idx on public.books (user_id, processing_status, updated_at desc);

alter table public.books
  add column if not exists processed_path text null,
  add column if not exists processing_status text not null default 'ready',
  add column if not exists processing_progress integer not null default 100,
  add column if not exists processing_stage text null,
  add column if not exists processing_error text null,
  add column if not exists processed_at timestamptz null,
  add column if not exists source_deleted_at timestamptz null;

alter table public.books
  drop constraint if exists books_processing_status_check;
alter table public.books
  add constraint books_processing_status_check check (processing_status in ('queued', 'processing', 'ready', 'error', 'cancelled'));

-- ============================================
-- Book processing jobs (queue)
-- ============================================

create table if not exists public.book_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id text not null,
  language text not null default 'en',

  status text not null default 'queued',
  progress integer not null default 0,
  stage text null,
  error text null,

  source_path text null,
  source_url text null,
  processed_path text null,

  attempts integer not null default 0,
  locked_at timestamptz null,
  locked_by text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, book_id),
  constraint book_processing_jobs_status_check check (status in ('queued', 'processing', 'done', 'error', 'cancelled')),
  constraint book_processing_jobs_source_check check (
    (source_path is not null and source_url is null)
    or
    (source_path is null and source_url is not null)
  )
);

create index if not exists book_processing_jobs_status_idx on public.book_processing_jobs (status, updated_at asc);
create index if not exists book_processing_jobs_user_idx on public.book_processing_jobs (user_id, updated_at desc);

alter table public.book_processing_jobs enable row level security;

drop policy if exists "book_processing_jobs_select_own" on public.book_processing_jobs;
create policy "book_processing_jobs_select_own" on public.book_processing_jobs
for select using (auth.uid() = user_id);

drop policy if exists "book_processing_jobs_insert_own" on public.book_processing_jobs;
create policy "book_processing_jobs_insert_own" on public.book_processing_jobs
for insert with check (auth.uid() = user_id);

drop policy if exists "book_processing_jobs_update_own" on public.book_processing_jobs;
create policy "book_processing_jobs_update_own" on public.book_processing_jobs
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "book_processing_jobs_delete_own" on public.book_processing_jobs;
create policy "book_processing_jobs_delete_own" on public.book_processing_jobs
for delete using (auth.uid() = user_id);

create or replace function public._require_service_role()
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  jwt_role text;
begin
  jwt_role := nullif(current_setting('request.jwt.claim.role', true), '');
  if jwt_role is null then
    begin
      jwt_role := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role');
    exception
      when others then
        jwt_role := null;
    end;
  end if;

  if coalesce(jwt_role, '') <> 'service_role' then
    raise exception 'service role required';
  end if;
end;
$$;

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

create or replace function public.update_book_processing_job(job_id uuid, new_status text, new_progress integer, new_stage text, new_error text, new_processed_path text)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform public._require_service_role();

  update public.book_processing_jobs
  set status = coalesce(new_status, status),
      progress = coalesce(new_progress, progress),
      stage = coalesce(new_stage, stage),
      error = new_error,
      processed_path = coalesce(new_processed_path, processed_path),
      updated_at = now()
  where id = job_id;
end;
$$;

create or replace function public.update_book_processing_fields(target_user_id uuid, target_book_id text, new_status text, new_progress integer, new_stage text, new_error text, new_processed_path text, did_delete_source boolean default false)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform public._require_service_role();

  update public.books
  set processing_status = coalesce(new_status, processing_status),
      processing_progress = coalesce(new_progress, processing_progress),
      processing_stage = coalesce(new_stage, processing_stage),
      processing_error = new_error,
      processed_path = coalesce(new_processed_path, processed_path),
      processed_at = case when new_status = 'ready' then now() else processed_at end,
      source_deleted_at = case when did_delete_source then now() else source_deleted_at end,
      updated_at = now()
  where user_id = target_user_id and id = target_book_id;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create table if not exists public.progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id text not null,

  chapter_id text null,
  page_number integer not null default 0,
  scroll_position integer not null default 0,
  char_offset integer not null default 0,
  chapter_text_hash text null,

  updated_at timestamptz not null default now(),

  primary key (user_id, book_id)
);

create index if not exists progress_user_updated_idx on public.progress (user_id, updated_at desc);

create table if not exists public.vocabulary (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,

  -- 'book' for per-book word status; 'global' for FSRS card state; 'global-known' for cross-book known tracking
  kind text not null,
  book_id text null,
  language text null,
  word text null,

  display_word text null,
  lemma text null,
  status text null,
  context jsonb null,
  analysis jsonb null,
  source_chapter_id text null,

  -- Global (FSRS) fields
  source_books jsonb not null default '[]'::jsonb,
  meaning text null,
  usage text null,
  contextual_meaning text null,
  context_sentence text null,

  -- Global known fields
  encounter_count integer null,
  last_encountered_at timestamptz null,

  due timestamptz null,
  stability double precision null,
  difficulty double precision null,
  elapsed_days double precision null,
  scheduled_days double precision null,
  reps integer null,
  lapses integer null,
  state integer null,
  last_review timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id, id),

  constraint vocabulary_kind_check check (kind in ('book', 'global', 'global-known')),
  constraint vocabulary_book_fields_check check (
    (kind = 'book' and book_id is not null and word is not null)
    or
    (kind in ('global', 'global-known') and book_id is null and word is not null)
  )
);

create index if not exists vocabulary_user_kind_updated_idx on public.vocabulary (user_id, kind, updated_at desc);
create index if not exists vocabulary_user_book_idx on public.vocabulary (user_id, kind, book_id);
create index if not exists vocabulary_user_kind_language_idx on public.vocabulary (user_id, kind, language);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

alter table public.books enable row level security;
alter table public.progress enable row level security;
alter table public.vocabulary enable row level security;

drop policy if exists "books_select_own" on public.books;
create policy "books_select_own" on public.books
for select using (auth.uid() = user_id);

drop policy if exists "books_insert_own" on public.books;
create policy "books_insert_own" on public.books
for insert with check (auth.uid() = user_id);

drop policy if exists "books_update_own" on public.books;
create policy "books_update_own" on public.books
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "books_delete_own" on public.books;
create policy "books_delete_own" on public.books
for delete using ((select auth.uid()) = user_id);

drop policy if exists "progress_select_own" on public.progress;
create policy "progress_select_own" on public.progress
for select using (auth.uid() = user_id);

drop policy if exists "progress_upsert_own" on public.progress;
create policy "progress_upsert_own" on public.progress
for insert with check (auth.uid() = user_id);

drop policy if exists "progress_update_own" on public.progress;
create policy "progress_update_own" on public.progress
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "progress_delete_own" on public.progress;
create policy "progress_delete_own" on public.progress
for delete using (auth.uid() = user_id);

drop policy if exists "vocabulary_select_own" on public.vocabulary;
create policy "vocabulary_select_own" on public.vocabulary
for select using (auth.uid() = user_id);

drop policy if exists "vocabulary_insert_own" on public.vocabulary;
create policy "vocabulary_insert_own" on public.vocabulary
for insert with check (auth.uid() = user_id);

drop policy if exists "vocabulary_update_own" on public.vocabulary;
create policy "vocabulary_update_own" on public.vocabulary
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "vocabulary_delete_own" on public.vocabulary;
create policy "vocabulary_delete_own" on public.vocabulary
for delete using (auth.uid() = user_id);

-- ============================================
-- Storage: Bucket + RLS policies
-- ============================================

-- Create private bucket for EPUB files
insert into storage.buckets (id, name, public)
values ('epubs', 'epubs', false)
on conflict (id) do nothing;

-- RLS policies on storage.objects
-- Users can only access objects under: "<user_id>/..."

drop policy if exists "epubs_read_own" on storage.objects;
create policy "epubs_read_own" on storage.objects
for select
using (
  bucket_id = 'epubs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "epubs_insert_own" on storage.objects;
create policy "epubs_insert_own" on storage.objects
for insert
with check (
  bucket_id = 'epubs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "epubs_update_own" on storage.objects;
create policy "epubs_update_own" on storage.objects
for update
using (
  bucket_id = 'epubs'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'epubs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "epubs_delete_own" on storage.objects;
create policy "epubs_delete_own" on storage.objects
for delete
using (
  bucket_id = 'epubs'
  and auth.uid()::text = (storage.foldername(name))[1]
);
