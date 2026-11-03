-- Invite codes for the invite-only beta.
--
-- A founder creates a code in the SQL editor (see docs/invites.md) and hands it
-- to someone they trust. Entering it lifts that member to level 2 (or level 3
-- for a host or organiser code), so people who sign in with a personal email
-- are not stuck at read-only. Each code has a use limit and an optional expiry.
--
-- Members can never read or write these tables. They can only call
-- redeem_invite(), which tells them whether a code worked and nothing else.
-- Wrong guesses are counted: 10 in an hour locks the member out for the hour.
--
-- Also in this migration: events now need level 2 instead of 3. Meet-ups are the
-- main way a community forms, so level 2 members can host one. Jobs, referrals
-- and housing stay at level 3 because that is where money scams live.

create table public.invites (
  code text primary key check (code ~ '^[A-Z0-9-]{6,32}$'),
  level smallint not null default 2 check (level in (2, 3)),
  max_uses integer not null default 10 check (max_uses between 1 and 1000),
  uses integer not null default 0 check (uses >= 0),
  expires_at timestamptz,
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  check (uses <= max_uses)
);

-- One invite per member.
create table public.invite_redemptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  code text not null references public.invites (code),
  redeemed_at timestamptz not null default now()
);

-- Failed guesses only; used for the rate limit.
create table public.invite_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index invite_attempts_user_idx on public.invite_attempts (user_id, created_at desc);

-- Returns the member's trust level after redeeming, or 0 when the code is not
-- valid (unknown, expired or used up). Asking again after a success is harmless.
create function public.redeem_invite(p_code text) returns smallint
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  inv public.invites;
  current_level smallint;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = 'P0001';
  end if;
  select trust_level into current_level from public.profiles where id = me;
  if current_level is null then
    raise exception 'Finish setting up your profile first.' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.invite_redemptions where user_id = me) then
    return current_level;
  end if;

  if (select count(*) from public.invite_attempts
      where user_id = me and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many tries. Wait an hour, then try again.' using errcode = 'P0001';
  end if;

  select * into inv from public.invites where code = v_code for update;
  if inv.code is null or inv.uses >= inv.max_uses or (inv.expires_at is not null and inv.expires_at <= now()) then
    insert into public.invite_attempts (user_id) values (me);
    return 0;
  end if;

  insert into public.invite_redemptions (user_id, code) values (me, v_code);
  update public.invites set uses = uses + 1 where code = v_code;
  update public.profiles set trust_level = greatest(trust_level, inv.level) where id = me;
  return (select trust_level from public.profiles where id = me);
end;
$$;

create or replace function public.required_level(p_type public.post_type, p_details jsonb) returns smallint
language sql immutable set search_path = '' as $$
  select case
    when p_type = 'job' then 3
    when p_type = 'notice' and p_details ->> 'category' = 'housing' then 3
    else 2
  end::smallint;
$$;

revoke all on public.invites, public.invite_redemptions, public.invite_attempts from anon, authenticated;
alter table public.invites enable row level security;
alter table public.invite_redemptions enable row level security;
alter table public.invite_attempts enable row level security;

revoke all on function public.redeem_invite(text) from public, anon, authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
