-- Launch content for day 1, so the first people to join find something useful.
--
-- Run once in the Supabase SQL editor AFTER you have signed in to the app and
-- finished your profile. It is not a migration: it posts as YOUR account, so
-- everything is honestly from you, and it is safe to run twice (it skips what
-- is already there).
--
-- What it adds
--   * City circles (Dublin, London): a welcome note, a first-week checklist, a
--     scam warning, and two open questions that invite members to share tips.
--   * Every other circle: a short "say hello" note.
--
-- What it does not do: it creates no fake members, replies, reviews or events.
-- Read the wording below and change anything you like before running it.
--
-- Optional: make your name show as the team. Remove the leading dashes to use it.
-- update public.profiles set display_name = 'Sangam team', bio = 'Looking after the community. Message me with feedback.'
--   where id = (select id from auth.users where email = 'turtletech.labs@gmail.com');

do $seed$
declare
  v_author uuid := (select id from auth.users where email = 'turtletech.labs@gmail.com');
  c record;
  v_city text;
  v_base timestamptz := now();
begin
  if v_author is null or not exists (select 1 from public.profiles where id = v_author) then
    raise exception 'Sign in to the app once with turtletech.labs@gmail.com and finish your profile, then run this again.';
  end if;

  -- The posting limit (10 an hour) and the timestamp rule would get in the way
  -- of a one-off bulk load, so they are paused for this script only. It all runs
  -- as one step: if anything fails, nothing is saved and the rule stays on.
  alter table public.posts disable trigger posts_before_insert;

  -- ---------------------------------------------------------- city circles
  for c in select id, name from public.circles where kind = 'city' and slug in ('dublin', 'london') loop
    v_city := c.name;
    if exists (select 1 from public.posts where circle_id = c.id and author_id = v_author and title like 'Welcome to Sangam%') then
      continue;
    end if;

    -- Inserted oldest first, so the welcome note is on top of the feed.
    insert into public.posts (circle_id, author_id, type, title, body, details, created_at) values
    (c.id, v_author, 'question',
      'Where do you get Indian groceries, a good chai, and a barber who gets it?',
      'Newcomers always ask this in the first week. Share what you use in ' || v_city || ': a shop, a place to eat, a temple, gurdwara or mosque, a tailor, anything. Name the area so people can find it.',
      '{"topic":"other"}'::jsonb, v_base - interval '5 minutes'),
    (c.id, v_author, 'question',
      'What do you wish you had known in your first month?',
      $b$A mistake you made, a tip, or a thing that surprised you. One or two lines is plenty. It will help the next person who lands.$b$,
      '{"topic":"other"}'::jsonb, v_base - interval '4 minutes'),
    (c.id, v_author, 'notice',
      'Scam alert: six tricks that target newcomers',
      $b$These come up again and again for people new to a country. If something feels rushed, stop and check first.

1. A "landlord" asks for a deposit before you have seen the home, or wants it sent to a person abroad. Never pay before a viewing and a written agreement.
2. A caller says they are from immigration, the tax office or the police and demands money, or threatens arrest or deportation. Real authorities do not do this. Hang up and call the official number yourself.
3. A job offer asks you to pay a fee for training, a visa or equipment.
4. A parcel or delivery message with a link asking for a small fee or your card details.
5. A "relative in trouble" message from a new number asking for money urgently. Call them on their old number first.
6. Anyone asking for gift cards, crypto or a code sent to your phone.

Seen one? Use the Report button on the post or message so we can warn others.$b$,
      '{"category":"alert"}'::jsonb, v_base - interval '3 minutes'),
    (c.id, v_author, 'notice',
      case when v_city = 'Dublin' then 'Your first week in Dublin: five things to sort'
           else 'Your first week in London: five things to sort' end,
      case when v_city = 'Dublin' then
$b$1. Emergencies: call 112 or 999. Both are free from any phone.
2. Register with a GP (family doctor) and find a pharmacy near home. Many practices are full, so ask a few.
3. Apply for your PPS number through MyWelfare. You need it for work and tax.
4. From outside the EU or EEA and staying over 90 days? Book your immigration registration early. Appointments fill up.
5. Get a Leap Card for cheaper fares on buses, Luas, DART and trains.

The full guide, with official links, is in Services, then Guides.$b$
      else
$b$1. Emergencies: call 999 (or 112). For urgent help that is not an emergency, call NHS 111.
2. Register with a GP. It is free, and you do not need proof of address or ID.
3. Apply online for a National Insurance number if you have the right to work. You can start work before it arrives.
4. Set up your UKVI account so you can share your eVisa status with employers and landlords.
5. Use the same contactless or Oyster card every time, so fare caps work.

The full guide, with official links, is in Services, then Guides.$b$ end,
      '{"category":"general"}'::jsonb, v_base - interval '2 minutes'),
    (c.id, v_author, 'notice',
      'Welcome to Sangam: start here',
      $b$Sangam is a community for Indians abroad and their families back home. Right now it is a small invited group in Dublin and London, so you are early.

What you can do here:
- Ask a question or post a notice in your city circle.
- Join circles for your work, college or home state (Profile, then Manage your circles).
- Ask to chat with someone. Nobody can message you until you accept.
- Use Safety: SOS, "I'm safe" check-ins and your emergency card. They stay on your phone.
- Read the Guides and look at Services for help settling in, or for your parents back home.

What we ask: be kind, never share other people's details, and report anything that feels wrong.

Tell us what is confusing or missing. We read everything. Reply here or message us.$b$,
      '{"category":"general"}'::jsonb, v_base);
  end loop;

  -- ---------------------------------------------------------- other circles
  for c in select id, name from public.circles where kind <> 'city' loop
    if exists (select 1 from public.posts where circle_id = c.id and author_id = v_author and title like 'Welcome to the %') then
      continue;
    end if;
    insert into public.posts (circle_id, author_id, type, title, body, details, created_at) values
    (c.id, v_author, 'notice',
      'Welcome to the ' || c.name || ' circle',
      'Say hello, ask a question, or share something useful. A good first post: where you are, what you do, and one thing you would like help with. Be kind, and never share anyone else''s details.',
      '{"category":"general"}'::jsonb, v_base);
  end loop;

  alter table public.posts enable trigger posts_before_insert;
end
$seed$;
