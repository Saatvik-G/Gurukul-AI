-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- 1. SESSIONS TABLE
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text default 'default_user',
  title text not null,
  state text not null check (state in ('explaining', 'questioning', 'evaluating', 'reexplaining', 'adapting', 'done')),
  current_concept_index int not null default 0,
  language text not null default 'en',
  target_depth text not null default 'beginner' check (target_depth in ('beginner', 'intermediate', 'advanced')),
  available_time_minutes int not null default 20,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 2. LESSON PLANS TABLE
create table if not exists lesson_plans (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  concepts jsonb not null default '[]'::jsonb,
  total_time_minutes int not null default 20,
  language text not null default 'en',
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 3. CONCEPTS / CHUNKS TABLE WITH PGVECTOR
create table if not exists concepts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  section_name text,
  concept_name text not null,
  definition text,
  examples jsonb default '[]'::jsonb,
  content_chunk text not null,
  embedding vector(768), -- Gemini text-embedding-004 produces 768 dimensions
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- Index for fast vector similarity search
create index if not exists concepts_embedding_idx 
on concepts 
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- 4. LEARNER PROFILE TABLE
create table if not exists learner_profile (
  id uuid primary key default gen_random_uuid(),
  user_id text unique not null default 'default_user',
  strong_concepts text[] default array[]::text[],
  weak_concepts text[] default array[]::text[],
  learning_pace text default 'medium',
  session_history jsonb default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 5. ASSESSMENT RESULTS TABLE
create table if not exists assessment_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete set null,
  user_id text default 'default_user',
  score int not null default 0,
  total_questions int not null default 0,
  strong_concepts text[] default array[]::text[],
  weak_concepts text[] default array[]::text[],
  recommended_next text,
  detailed_responses jsonb default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 6. MATCH CONCEPTS VECTOR SEARCH RPC
create or replace function match_concepts (
  query_embedding vector(768),
  match_threshold float default 0.3,
  match_count int default 5,
  filter_session_id uuid default null
)
returns table (
  id uuid,
  session_id uuid,
  concept_name text,
  definition text,
  content_chunk text,
  similarity float
)
language sql stable
as $$
  select
    concepts.id,
    concepts.session_id,
    concepts.concept_name,
    concepts.definition,
    concepts.content_chunk,
    1 - (concepts.embedding <=> query_embedding) as similarity
  from concepts
  where (filter_session_id is null or concepts.session_id = filter_session_id)
    and 1 - (concepts.embedding <=> query_embedding) > match_threshold
  order by (concepts.embedding <=> query_embedding) asc
  limit match_count;
$$;
