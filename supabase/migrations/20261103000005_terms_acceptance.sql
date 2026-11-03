-- Records which version of the community rules, terms and privacy policy a
-- member accepted, and when. The member sets the version (a date such as
-- 2026-11-03, matching docs/legal); the database stamps the time itself, so a
-- member cannot back-date or hide their acceptance.

alter table public.profiles
  add column terms_version text check (terms_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  add column terms_accepted_at timestamptz;

grant insert (terms_version) on public.profiles to authenticated;
grant update (terms_version) on public.profiles to authenticated;

create or replace function public.profiles_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.trust_level := public.initial_trust_level((select email from auth.users where id = new.id));
    new.is_expert := false;
    new.created_at := now();
    new.terms_accepted_at := case when new.terms_version is null then null else now() end;
  elsif new.terms_version is distinct from old.terms_version then
    new.terms_accepted_at := case when new.terms_version is null then null else now() end;
  else
    new.terms_accepted_at := old.terms_accepted_at;
  end if;
  new.display_name := btrim(new.display_name);
  new.updated_at := now();
  return new;
end;
$$;
