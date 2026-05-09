create table if not exists public.task_queue (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_task_queue_status on public.task_queue(status);
create index if not exists idx_task_queue_created_at on public.task_queue(created_at desc);

alter table public.task_queue enable row level security;

create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  level text not null,
  source text not null,
  message text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.logs enable row level security;
alter publication supabase_realtime add table public.logs;

alter table public.channels
  add column if not exists handle text,
  add column if not exists title text,
  add column if not exists last_scanned_at timestamptz,
  add column if not exists is_active boolean not null default true;

update public.channels
set handle = coalesce(handle, username),
    title = coalesce(title, username)
where handle is null or title is null;

create unique index if not exists idx_channels_handle_unique on public.channels(handle);
