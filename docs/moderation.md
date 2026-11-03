# Moderation and privacy requests (hand-run until the admin console ships)

The community rules promise that we read every report. Until the admin console
(A3 and B6 in `docs/next-features.md`) exists, you do this in the Supabase SQL
editor. Check reports at least once a day during the beta. Serious safety reports
come first.

## 1. See open reports

```sql
select r.id, r.created_at, r.target, r.target_id, r.reason, p.display_name as reported_by
from public.reports r join public.profiles p on p.id = r.reporter_id
where r.status = 'open' order by r.created_at;
```

## 2. Look at what was reported

```sql
-- a post
select p.id, p.type, p.title, p.body, p.status, a.display_name as author, a.id as author_id
from public.posts p join public.profiles a on a.id = p.author_id where p.id = '<target_id>';

-- a reply
select r.id, r.body, r.status, a.display_name as author, a.id as author_id
from public.replies r join public.profiles a on a.id = r.author_id where r.id = '<target_id>';

-- a message (read only this one message and the lines around it, and only because it was reported)
select m.id, m.sender_id, m.body, m.created_at from public.messages m
where m.conversation_id = (select conversation_id from public.messages where id = '<target_id>')
order by m.created_at;

-- a profile
select id, display_name, city, profession, bio, trust_level, created_at from public.profiles where id = '<target_id>';
```

## 3. Decide and act

Match the decision to the community rules. Hide first if you are unsure; it can be undone.

```sql
-- hide (reversible): use 'visible' to restore, 'removed' for permanent removal
update public.posts   set status = 'hidden' where id = '<post id>';
update public.replies set status = 'hidden' where id = '<reply id>';

-- remove a message
delete from public.messages where id = '<message id>';

-- take someone's level down while you investigate
update public.profiles set trust_level = 1 where id = '<member id>';

-- remove a member and everything they posted (cannot be undone)
delete from auth.users where id = '<member id>';

-- close the report
update public.reports set status = 'actioned' where id = '<report id>';   -- or 'dismissed'
```

Members can sign up again with a new email. If someone keeps coming back, note the
details (name, city, pattern) in a private file and tell them no through any
invite codes you control.

## 4. Things that go beyond Sangam

- **Immediate danger:** tell the person to call their local emergency number. Sangam is not an emergency service.
- **Child sexual abuse material:** don't open, save, forward or screenshot it. Remove it, then report it to the police and to Hotline.ie (Ireland) or the Internet Watch Foundation (UK).
- **Credible fraud or threats:** keep the post, message and member ID, remove from view, and report to the Gardaí or the police if a member asks, or the risk is serious. The law may require you to share information. Get advice before you hand anything over.

## 5. Privacy requests from members

Reply within one month (the law's limit). Check who is asking: it must come from the email the account uses.

```sql
-- what we hold about a member (email, profile, invite)
select u.email, p.* from public.profiles p join auth.users u on u.id = p.id where u.email = '<their email>';
select * from public.invite_redemptions where user_id = '<member id>';
select count(*) from public.posts where author_id = '<member id>';
select * from public.service_requests where user_id = '<member id>';
```

- **Copy of their data:** export the rows above (and their posts, replies and messages) to a file and send it from the account email.
- **Deletion:** ask them to use Profile, Delete account, or run `delete from auth.users where id = '<member id>';` if they ask you to.
- **Correction:** they can edit their profile in the app.

## 6. If something goes wrong with data

If you think someone else saw data they should not have (a leaked key, a wrong
setting, a lost laptop): rotate the key or sign the device out, write down what
happened and when, and get advice. A breach that puts members at risk may have to
be reported to the data protection authority within 72 hours.

## 7. Keep the documents true

If Sangam starts collecting new data (images, analytics, a new provider such as
Didit for ID checks) or changes how it handles data, update `docs/legal/*.md`,
change `TERMS_VERSION` in `app/src/config.ts` and the version line at the top of
each document, run `node app/scripts/legal.mjs`, and commit. Members are then asked
to accept the new version.
