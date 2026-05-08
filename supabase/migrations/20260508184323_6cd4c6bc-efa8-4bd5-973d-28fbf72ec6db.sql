
-- Channels parsed by the user
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  style_description text not null default 'Стиль ещё не описан.',
  added_at timestamptz not null default now(),
  unique (user_id, username)
);

alter table public.channels enable row level security;

create policy "channels_select_own" on public.channels for select to authenticated using (auth.uid() = user_id);
create policy "channels_insert_own" on public.channels for insert to authenticated with check (auth.uid() = user_id);
create policy "channels_update_own" on public.channels for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "channels_delete_own" on public.channels for delete to authenticated using (auth.uid() = user_id);

-- Watermark settings (one row per user)
create table public.watermark_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  image_path text,
  opacity numeric not null default 0.5,
  updated_at timestamptz not null default now()
);

alter table public.watermark_settings enable row level security;

create policy "wm_select_own" on public.watermark_settings for select to authenticated using (auth.uid() = user_id);
create policy "wm_insert_own" on public.watermark_settings for insert to authenticated with check (auth.uid() = user_id);
create policy "wm_update_own" on public.watermark_settings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table public.channels;
alter publication supabase_realtime add table public.watermark_settings;

-- Storage bucket for watermarks (private)
insert into storage.buckets (id, name, public) values ('watermarks', 'watermarks', false)
on conflict (id) do nothing;

create policy "wm_storage_select_own" on storage.objects for select to authenticated
using (bucket_id = 'watermarks' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "wm_storage_insert_own" on storage.objects for insert to authenticated
with check (bucket_id = 'watermarks' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "wm_storage_update_own" on storage.objects for update to authenticated
using (bucket_id = 'watermarks' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "wm_storage_delete_own" on storage.objects for delete to authenticated
using (bucket_id = 'watermarks' and auth.uid()::text = (storage.foldername(name))[1]);
