# Invite codes (beta)

An invite code lifts a member to **level 2** (or **level 3** for a host or
organiser code), so people who join with Gmail can post and message straight
away. Members enter the code at sign-up ("Invite code (optional)") or later on
their Profile.

## Create codes

In the Supabase SQL editor (never from the app):

```sql
-- 10 testers, level 2
insert into public.invites (code, note, max_uses)
values ('DUBLIN-WELCOME', 'first 10 Dublin testers', 10);

-- one organiser who can also post jobs and housing (level 3)
insert into public.invites (code, level, max_uses, note)
values ('HOST-PRIYA-7', 3, 1, 'Priya, community host');

-- expiring code
insert into public.invites (code, max_uses, expires_at, note)
values ('LONDON-NOV', 25, now() + interval '30 days', 'London launch week');
```

Codes are 6 to 32 characters: capital letters, numbers and dashes. Members can
type them in any case.

## See and stop codes

```sql
select code, level, uses, max_uses, expires_at, note from public.invites order by created_at desc;

-- who joined with which code
select p.display_name, r.code, r.redeemed_at
from public.invite_redemptions r join public.profiles p on p.id = r.user_id order by r.redeemed_at desc;

-- switch a code off
update public.invites set expires_at = now() where code = 'DUBLIN-WELCOME';
```

## Rules

- One code per member. Entering a second code changes nothing.
- A code never lowers a level.
- Members cannot read or change codes. Ten wrong guesses in an hour locks the
  member out for the hour.
- Share codes one to one (WhatsApp is fine). A leaked code is stopped with the
  last query above.

## Launch content

`supabase/seed/launch_content.sql` posts a welcome note, a first-week checklist,
a scam warning and two open questions in the Dublin and London circles, and a
short hello in every other circle, all as your own account. Sign in once, finish
your profile, read the wording, then run it in the SQL editor. Running it twice
is safe.

Preview codes for the demo build: `SANGAM-DEMO` (level 2), `SANGAM-HOST` (level 3).
