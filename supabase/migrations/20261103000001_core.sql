-- Core schema for the MVP: profiles and trust levels, circles, posts (notices,
-- questions, jobs, events), replies, RSVPs, blocks, reports, request-to-chat
-- and messages.
--
-- Security model
--   * Row-level security is on for every table; no table is readable by `anon`.
--   * Members can never raise their own trust level, expert badge, post status
--     or counters: column-level grants leave those columns out.
--   * Trust levels: 1 = email, 2 = work/university email (or vouched),
--     3 = government ID check. Level 2 posts notices and questions, replies and
--     sends chat requests; level 3 also posts jobs, events and housing.
--   * Blocking hides content both ways and stops new messages.
--   * Chats start only from an accepted request; there is no forwarding.

-- ---------------------------------------------------------------- types
create type public.circle_kind as enum ('city', 'profession', 'alma_mater', 'home_state', 'language', 'life_stage');
create type public.post_type as enum ('notice', 'question', 'job', 'event');
create type public.content_status as enum ('visible', 'hidden', 'removed');
create type public.request_status as enum ('pending', 'accepted', 'declined');
create type public.report_target as enum ('post', 'reply', 'message', 'profile');

-- ---------------------------------------------------------------- tables
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 60),
  city text not null default '' check (char_length(city) <= 60),
  country text not null default '' check (country ~ '^([A-Z]{2})?$'),
  profession text not null default '' check (char_length(profession) <= 80),
  alma_mater text not null default '' check (char_length(alma_mater) <= 80),
  home_state text not null default '' check (char_length(home_state) <= 60),
  bio text not null default '' check (char_length(bio) <= 500),
  trust_level smallint not null default 1 check (trust_level between 1 and 3),
  is_expert boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.circles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 2 and 80),
  kind public.circle_kind not null,
  city text,
  member_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.circle_members (
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create index circle_members_user_idx on public.circle_members (user_id);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  type public.post_type not null,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  status public.content_status not null default 'visible',
  expires_at timestamptz,
  reply_count integer not null default 0,
  rsvp_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint event_details check (type <> 'event' or (details ? 'startsAt' and details ? 'venue'))
);
create index posts_circle_created_idx on public.posts (circle_id, created_at desc);
create index posts_author_idx on public.posts (author_id);

create table public.replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  status public.content_status not null default 'visible',
  created_at timestamptz not null default now()
);
create index replies_post_idx on public.replies (post_id, created_at);

create table public.event_rsvps (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target public.report_target not null,
  target_id uuid not null,
  reason text not null check (char_length(btrim(reason)) between 3 and 1000),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now()
);

create table public.chat_requests (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  note text not null check (char_length(btrim(note)) between 10 and 280),
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (from_id <> to_id)
);
create unique index chat_requests_one_pending on public.chat_requests (from_id, to_id) where status = 'pending';
create index chat_requests_to_idx on public.chat_requests (to_id, status);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  last_message text not null default '',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_sender_recent_idx on public.messages (sender_id, created_at desc);

-- ---------------------------------------------------------------- helper functions
-- Security definer helpers read across RLS boundaries but only ever answer
-- questions about the calling member. `search_path` is pinned to stop hijacking.

create function public.my_trust_level() returns smallint
language sql stable security definer set search_path = '' as $$
  select coalesce((select trust_level from public.profiles where id = auth.uid()), 0)::smallint;
$$;

create function public.required_level(p_type public.post_type, p_details jsonb) returns smallint
language sql immutable set search_path = '' as $$
  select case
    when p_type in ('job', 'event') then 3
    when p_type = 'notice' and p_details ->> 'category' = 'housing' then 3
    else 2
  end::smallint;
$$;

create function public.is_blocked_pair(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = auth.uid() and blocked_id = other)
       or (blocker_id = other and blocked_id = auth.uid())
  );
$$;

create function public.is_conversation_member(conv uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversation_members where conversation_id = conv and user_id = auth.uid());
$$;

create function public.is_circle_member(circ uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.circle_members where circle_id = circ and user_id = auth.uid());
$$;

-- Free webmail domains. Any other verified sign-in email counts as a work or
-- university address (trust level 2). Extend this list rather than the code.
create table public.freemail_domains (domain text primary key);
insert into public.freemail_domains (domain) values
  ('gmail.com'), ('googlemail.com'), ('yahoo.com'), ('yahoo.co.in'), ('yahoo.co.uk'), ('ymail.com'),
  ('outlook.com'), ('hotmail.com'), ('hotmail.co.uk'), ('live.com'), ('live.in'), ('msn.com'),
  ('icloud.com'), ('me.com'), ('mac.com'), ('aol.com'), ('proton.me'), ('protonmail.com'),
  ('gmx.com'), ('gmx.net'), ('mail.com'), ('zoho.com'), ('zohomail.in'), ('rediffmail.com'),
  ('yandex.com'), ('tutanota.com'), ('fastmail.com'), ('hey.com'), ('eircom.net');

create function public.initial_trust_level(p_email text) returns smallint
language sql stable security definer set search_path = '' as $$
  select case
    when p_email is null or position('@' in p_email) = 0 then 1
    when exists (select 1 from public.freemail_domains where domain = lower(split_part(p_email, '@', 2))) then 1
    else 2
  end::smallint;
$$;

-- ---------------------------------------------------------------- triggers
create function public.profiles_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.trust_level := public.initial_trust_level((select email from auth.users where id = new.id));
    new.is_expert := false;
    new.created_at := now();
  end if;
  new.display_name := btrim(new.display_name);
  new.updated_at := now();
  return new;
end;
$$;
create trigger profiles_before_write before insert or update on public.profiles
  for each row execute function public.profiles_before_write();

-- Members are always in their own city's circle.
create function public.profiles_join_city() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.circle_members (circle_id, user_id)
  select c.id, new.id from public.circles c
  where c.kind = 'city' and lower(c.city) = lower(new.city)
  on conflict do nothing;
  return new;
end;
$$;
create trigger profiles_join_city after insert or update of city on public.profiles
  for each row execute function public.profiles_join_city();

create function public.circle_members_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.circles set member_count = member_count + 1 where id = new.circle_id;
  else
    update public.circles set member_count = greatest(member_count - 1, 0) where id = old.circle_id;
  end if;
  return null;
end;
$$;
create trigger circle_members_count after insert or delete on public.circle_members
  for each row execute function public.circle_members_count();

create function public.replies_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set reply_count = reply_count + 1 where id = new.post_id;
  else
    update public.posts set reply_count = greatest(reply_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;
create trigger replies_count after insert or delete on public.replies
  for each row execute function public.replies_count();

-- RSVPs: events only, capacity enforced under a row lock.
create function public.rsvp_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  p record;
begin
  select type, details, rsvp_count into p from public.posts where id = new.post_id for update;
  if p.type is distinct from 'event' then
    raise exception 'Only events take RSVPs' using errcode = 'P0001';
  end if;
  if (p.details ->> 'capacity') is not null and p.rsvp_count >= (p.details ->> 'capacity')::int then
    raise exception 'This event is full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger rsvp_before_insert before insert on public.event_rsvps
  for each row execute function public.rsvp_before_insert();

create function public.rsvps_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set rsvp_count = rsvp_count + 1 where id = new.post_id;
  else
    update public.posts set rsvp_count = greatest(rsvp_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;
create trigger rsvps_count after insert or delete on public.event_rsvps
  for each row execute function public.rsvps_count();

-- Rate limits for new content. Generous for people, tight for bots.
create function public.messages_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '5 minutes') >= 30 then
    raise exception 'You are sending messages too quickly. Wait a few minutes.' using errcode = 'P0001';
  end if;
  new.created_at := now();
  return new;
end;
$$;
create trigger messages_before_insert before insert on public.messages
  for each row execute function public.messages_before_insert();

create function public.messages_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations
    set last_message = left(new.body, 140), last_message_at = new.created_at
    where id = new.conversation_id;
  return null;
end;
$$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.messages_after_insert();

create function public.chat_requests_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.chat_requests
      where from_id = new.from_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'You have sent the most chat requests allowed today.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.conversation_members a
    join public.conversation_members b on a.conversation_id = b.conversation_id
    where a.user_id = new.from_id and b.user_id = new.to_id
  ) then
    raise exception 'You already have a chat with this member.' using errcode = 'P0001';
  end if;
  new.status := 'pending';
  new.created_at := now();
  return new;
end;
$$;
create trigger chat_requests_before_insert before insert on public.chat_requests
  for each row execute function public.chat_requests_before_insert();

create function public.posts_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.posts
      where author_id = new.author_id and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'You have posted a lot in the last hour. Try again later.' using errcode = 'P0001';
  end if;
  new.status := 'visible';
  new.reply_count := 0;
  new.rsvp_count := 0;
  new.created_at := now();
  return new;
end;
$$;
create trigger posts_before_insert before insert on public.posts
  for each row execute function public.posts_before_insert();

-- ---------------------------------------------------------------- functions members call
-- Accept or decline a chat request. Accepting opens a conversation whose first
-- message is the requester's note.
create function public.respond_chat_request(request_id uuid, accept boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r public.chat_requests;
  conv uuid;
begin
  select * into r from public.chat_requests
    where id = request_id and to_id = auth.uid() and status = 'pending' for update;
  if not found then
    raise exception 'This request is no longer open.' using errcode = 'P0001';
  end if;
  update public.chat_requests
    set status = case when accept then 'accepted'::public.request_status else 'declined'::public.request_status end,
        responded_at = now()
    where id = r.id;
  if not accept then
    return null;
  end if;
  insert into public.conversations default values returning id into conv;
  insert into public.conversation_members (conversation_id, user_id) values (conv, r.from_id), (conv, r.to_id);
  insert into public.messages (conversation_id, sender_id, body) values (conv, r.from_id, r.note);
  return conv;
end;
$$;

-- Deletes the caller's account and, through cascades, everything they posted.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = 'P0001';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------- privileges
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.profiles, public.circles, public.circle_members, public.posts, public.replies,
  public.event_rsvps, public.blocks, public.reports, public.chat_requests, public.conversations,
  public.conversation_members, public.messages to authenticated;

grant insert (id, display_name, city, country, profession, alma_mater, home_state, bio) on public.profiles to authenticated;
grant update (display_name, city, country, profession, alma_mater, home_state, bio) on public.profiles to authenticated;
grant insert (circle_id) on public.circle_members to authenticated;
grant delete on public.circle_members to authenticated;
grant insert (circle_id, type, title, body, details, expires_at) on public.posts to authenticated;
grant update (title, body, details, expires_at) on public.posts to authenticated;
grant delete on public.posts to authenticated;
grant insert (post_id, body) on public.replies to authenticated;
grant delete on public.replies to authenticated;
grant insert (post_id) on public.event_rsvps to authenticated;
grant delete on public.event_rsvps to authenticated;
grant insert (blocked_id) on public.blocks to authenticated;
grant delete on public.blocks to authenticated;
grant insert (target, target_id, reason) on public.reports to authenticated;
grant insert (to_id, note) on public.chat_requests to authenticated;
grant insert (conversation_id, body) on public.messages to authenticated;

grant execute on function public.my_trust_level(), public.required_level(public.post_type, jsonb),
  public.is_blocked_pair(uuid), public.is_conversation_member(uuid), public.is_circle_member(uuid),
  public.respond_chat_request(uuid, boolean), public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------- row-level security
alter table public.profiles enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.posts enable row level security;
alter table public.replies enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.chat_requests enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.freemail_domains enable row level security;

-- profiles: visible to signed-in members, except people who blocked you.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or not public.is_blocked_pair(id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- circles: everyone signed in can browse them; only admins create them.
create policy circles_select on public.circles for select to authenticated using (true);

-- circle membership: you see and manage your own memberships only.
create policy circle_members_select on public.circle_members for select to authenticated
  using (user_id = auth.uid());
create policy circle_members_insert on public.circle_members for insert to authenticated
  with check (user_id = auth.uid());
create policy circle_members_delete on public.circle_members for delete to authenticated
  using (user_id = auth.uid());

-- posts: browsing is open to every signed-in member; posting needs the right
-- trust level and circle membership.
create policy posts_select on public.posts for select to authenticated
  using (
    author_id = auth.uid()
    or (status = 'visible' and (expires_at is null or expires_at > now()) and not public.is_blocked_pair(author_id))
  );
create policy posts_insert on public.posts for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.my_trust_level() >= public.required_level(type, details)
    and public.is_circle_member(circle_id)
  );
create policy posts_update on public.posts for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid() and public.my_trust_level() >= public.required_level(type, details));
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = auth.uid());

-- replies: readable where the post is readable; writing needs level 2.
create policy replies_select on public.replies for select to authenticated
  using (
    author_id = auth.uid()
    or (status = 'visible' and not public.is_blocked_pair(author_id)
        and exists (select 1 from public.posts p where p.id = post_id))
  );
create policy replies_insert on public.replies for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.my_trust_level() >= 2
    and exists (select 1 from public.posts p where p.id = post_id)
  );
create policy replies_delete on public.replies for delete to authenticated
  using (author_id = auth.uid());

-- RSVPs: private to each member; counts live on the post.
create policy rsvps_select on public.event_rsvps for select to authenticated using (user_id = auth.uid());
create policy rsvps_insert on public.event_rsvps for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id));
create policy rsvps_delete on public.event_rsvps for delete to authenticated using (user_id = auth.uid());

-- blocks and reports: your own only.
create policy blocks_select on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy blocks_insert on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy blocks_delete on public.blocks for delete to authenticated using (blocker_id = auth.uid());
create policy reports_select on public.reports for select to authenticated using (reporter_id = auth.uid());
create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());

-- chat requests: sender and recipient see them; sending needs level 2 and no block.
create policy chat_requests_select on public.chat_requests for select to authenticated
  using (from_id = auth.uid() or (to_id = auth.uid() and not public.is_blocked_pair(from_id)));
create policy chat_requests_insert on public.chat_requests for insert to authenticated
  with check (
    from_id = auth.uid()
    and to_id <> auth.uid()
    and public.my_trust_level() >= 2
    and not public.is_blocked_pair(to_id)
  );

-- conversations and messages: members only. Conversations are created by
-- respond_chat_request(); nobody inserts them directly.
create policy conversations_select on public.conversations for select to authenticated
  using (public.is_conversation_member(id));
create policy conversation_members_select on public.conversation_members for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy messages_select on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
    and not exists (
      select 1 from public.conversation_members m
      where m.conversation_id = messages.conversation_id
        and m.user_id <> auth.uid()
        and public.is_blocked_pair(m.user_id)
    )
  );

-- ---------------------------------------------------------------- realtime
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
