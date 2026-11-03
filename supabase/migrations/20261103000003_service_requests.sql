-- Service requests for the hand-run pilot (Basic, Essential and Emergency).
-- Members see and withdraw only their own requests. Status is set by staff
-- (service role) only. Phone numbers are optional and used only for a callback.

create type public.service_request_status as enum ('received', 'in_progress', 'done', 'declined');

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  service_id text not null check (service_id ~ '^[a-z0-9-]{2,40}$'),
  tier text not null check (tier in ('basic', 'essential', 'emergency')),
  for_whom text not null check (for_whom in ('me', 'parent', 'family')),
  location text not null default '' check (char_length(location) <= 120),
  timing text not null default '' check (char_length(timing) <= 60),
  details text not null check (char_length(btrim(details)) between 10 and 2000),
  contact_method text not null default 'chat' check (contact_method in ('chat', 'phone')),
  phone text not null default '' check (char_length(phone) <= 30),
  status public.service_request_status not null default 'received',
  staff_note text not null default '' check (char_length(staff_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (contact_method <> 'phone' or char_length(phone) >= 8)
);
create index service_requests_user_idx on public.service_requests (user_id, created_at desc);

create function public.service_requests_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.service_requests
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You have made a lot of requests today. A relationship manager will be in touch.' using errcode = 'P0001';
  end if;
  new.status := 'received';
  new.staff_note := '';
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;
create trigger service_requests_before_insert before insert on public.service_requests
  for each row execute function public.service_requests_before_insert();

revoke all on public.service_requests from anon, authenticated;
grant select on public.service_requests to authenticated;
grant insert (service_id, tier, for_whom, location, timing, details, contact_method, phone) on public.service_requests to authenticated;
grant delete on public.service_requests to authenticated;

alter table public.service_requests enable row level security;

create policy service_requests_select on public.service_requests for select to authenticated
  using (user_id = auth.uid());
create policy service_requests_insert on public.service_requests for insert to authenticated
  with check (user_id = auth.uid());
-- Members can withdraw a request until someone starts working on it.
create policy service_requests_delete on public.service_requests for delete to authenticated
  using (user_id = auth.uid() and status = 'received');
