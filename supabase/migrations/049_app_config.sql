create table if not exists app_config (
  key text primary key,
  value text not null
);

-- min_version: oldest app version allowed to run. Bump this to force updates.
insert into app_config (key, value) values ('min_version', '1.0.0')
  on conflict (key) do nothing;

-- Public read, no writes from client.
alter table app_config enable row level security;
create policy "public read" on app_config for select using (true);
