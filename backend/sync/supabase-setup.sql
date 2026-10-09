-- Fortune Tiles cloud sync: run once in the Supabase SQL editor (replace __APP_SECRET__ with the key in
-- backend/config/sync.secret.json first). The app sends that key with every request; without it nothing is readable.
create sequence if not exists public.sync_seq;

create table if not exists public.sync_devices (
  device_no int generated always as identity primary key,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.sync_records (
  table_name text not null,
  row_id bigint not null,
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null,
  device_no int not null,
  seq bigint not null default nextval('public.sync_seq'),
  primary key (table_name, row_id)
);
create index if not exists sync_records_seq_idx on public.sync_records (seq);

alter table public.sync_devices enable row level security;
alter table public.sync_records enable row level security;

-- True only for requests that carry the shop's app key in the x-fortune-key header.
create or replace function public.ft_app_ok() returns boolean language sql stable as $$
  select coalesce(current_setting('request.headers', true)::json ->> 'x-fortune-key', '') = '__APP_SECRET__'
$$;

drop policy if exists sync_records_read on public.sync_records;
create policy sync_records_read on public.sync_records for select to anon, authenticated using (public.ft_app_ok());

create or replace function public.sync_register_device(device_name text)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.ft_app_ok() then raise exception 'not allowed'; end if;
  insert into public.sync_devices(name) values (device_name) returning device_no into n;
  return n;
end $$;

-- Newer edit wins: a record is only replaced by one with an equal or later timestamp.
create or replace function public.sync_push(records jsonb, device int)
returns int language plpgsql security definer set search_path = public as $$
declare r jsonb; n int := 0;
begin
  if not public.ft_app_ok() then raise exception 'not allowed'; end if;
  for r in select * from jsonb_array_elements(records) loop
    insert into public.sync_records(table_name, row_id, data, deleted, updated_at, device_no, seq)
    values (r->>'t', (r->>'id')::bigint, r->'d', coalesce((r->>'del')::boolean, false), (r->>'ts')::timestamptz, device, nextval('public.sync_seq'))
    on conflict (table_name, row_id) do update
      set data = excluded.data, deleted = excluded.deleted, updated_at = excluded.updated_at,
          device_no = excluded.device_no, seq = excluded.seq
      where public.sync_records.updated_at <= excluded.updated_at;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Used when an owner chooses to keep one device's data and discard what is in the cloud.
create or replace function public.sync_clear()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.ft_app_ok() then raise exception 'not allowed'; end if;
  delete from public.sync_records where true;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.ft_app_ok() from public;
revoke all on function public.sync_register_device(text) from public, anon, authenticated;
revoke all on function public.sync_push(jsonb, int) from public, anon, authenticated;
revoke all on function public.sync_clear() from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.sync_records to anon, authenticated;
grant execute on function public.ft_app_ok() to anon, authenticated;
grant execute on function public.sync_register_device(text) to anon, authenticated;
grant execute on function public.sync_push(jsonb, int) to anon, authenticated;
grant execute on function public.sync_clear() to anon, authenticated;
