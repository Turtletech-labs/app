// Database rule tests. Runs the migrations on a throwaway local Postgres with a
// minimal stand-in for Supabase's `auth` schema, then checks what each kind of
// member can and cannot do.
//
//   cd supabase/tests && npm install && npm test
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'migrations');
// Let initdb create the folder itself: as root, the package runs initdb as
// another user, which must own the data folder.
const dataDir = join(tmpdir(), `pg-${randomUUID()}`);
const port = 54329;

const AUTH_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

// nosemgrep: throwaway local test database, never reachable from outside
const server = new EmbeddedPostgres({ databaseDir: dataDir, user: 'postgres', password: 'postgres', port, persistent: false, onLog: () => {} });
let admin;
const results = [];

async function as(userId, sql, params = []) {
  // nosemgrep: throwaway local test database
  const c = new pg.Client({ host: 'localhost', port, user: 'postgres', password: 'postgres', database: 'app' });
  await c.connect();
  try {
    await c.query('begin');
    await c.query(`set local role ${userId === 'anon' ? 'anon' : 'authenticated'}`);
    if (userId !== 'anon') await c.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    const r = await c.query(sql, params);
    await c.query('commit');
    return r;
  } catch (e) {
    await c.query('rollback').catch(() => {});
    throw e;
  } finally {
    await c.end();
  }
}

async function test(name, fn) {
  try {
    await fn();
    results.push(['ok', name]);
  } catch (e) {
    results.push(['FAIL', name, e.message]);
  }
}

async function rejects(promise, pattern) {
  try {
    await promise;
  } catch (e) {
    if (pattern && !pattern.test(e.message)) throw new Error(`wrong error: ${e.message}`);
    return;
  }
  throw new Error('expected an error but the statement succeeded');
}

async function main() {
  await server.initialise();
  await server.start();
  await server.createDatabase('app');
  // nosemgrep: throwaway local test database
  admin = new pg.Client({ host: 'localhost', port, user: 'postgres', password: 'postgres', database: 'app' });
  await admin.connect();
  await admin.query(AUTH_STUB);
  for (const f of readdirSync(migrationsDir).filter((x) => x.endsWith('.sql')).sort()) {
    await admin.query(readFileSync(join(migrationsDir, f), 'utf8'));
  }

  const users = { gmail: randomUUID(), work: randomUUID(), verified: randomUUID(), other: randomUUID() };
  await admin.query(`insert into auth.users (id, email) values ($1,'asha@gmail.com'),($2,'ravi@acme.ie'),($3,'meera@uni.ac.uk'),($4,'dev@corp.co.uk')`,
    [users.gmail, users.work, users.verified, users.other]);
  const dublin = (await admin.query(`select id from public.circles where slug = 'dublin'`)).rows[0].id;
  const london = (await admin.query(`select id from public.circles where slug = 'london'`)).rows[0].id;

  const profile = (id, name) => as(id, `insert into public.profiles (id, display_name, city, country) values ($1, $2, 'Dublin', 'IE')`, [id, name]);

  await test('profiles get their trust level from the sign-in email', async () => {
    await profile(users.gmail, 'Asha');
    await profile(users.work, 'Ravi');
    await profile(users.verified, 'Meera');
    await profile(users.other, 'Dev');
    const r = await admin.query(`select id, trust_level from public.profiles`);
    const lvl = Object.fromEntries(r.rows.map((x) => [x.id, x.trust_level]));
    assert.equal(lvl[users.gmail], 1);
    assert.equal(lvl[users.work], 2);
    await admin.query(`update public.profiles set trust_level = 3 where id = $1`, [users.verified]);
  });

  await test('members join their city circle automatically', async () => {
    const r = await as(users.gmail, `select circle_id from public.circle_members`);
    assert.deepEqual(r.rows.map((x) => x.circle_id), [dublin]);
    const c = await admin.query(`select member_count from public.circles where id = $1`, [dublin]);
    assert.equal(c.rows[0].member_count, 4);
  });

  await test('members cannot raise their own trust level or expert badge', async () => {
    await rejects(as(users.gmail, `update public.profiles set trust_level = 3 where id = auth.uid()`), /permission denied/);
    await rejects(as(users.gmail, `update public.profiles set is_expert = true where id = auth.uid()`), /permission denied/);
    await rejects(as(users.gmail, `insert into public.profiles (id, display_name, trust_level) values (gen_random_uuid(), 'X', 3)`), /permission denied/);
  });

  await test("members cannot edit someone else's profile", async () => {
    const r = await as(users.gmail, `update public.profiles set bio = 'hacked' where id = $1 returning id`, [users.work]);
    assert.equal(r.rowCount, 0);
  });

  await test('signed-out visitors can read nothing', async () => {
    await rejects(as('anon', `select * from public.posts`), /permission denied/);
    await rejects(as('anon', `select * from public.profiles`), /permission denied/);
  });

  let noticeId;
  await test('level 1 cannot post; level 2 can post notices and questions', async () => {
    await rejects(as(users.gmail, `insert into public.posts (circle_id, type, title, body) values ($1, 'notice', 'Hello all', 'Hi')`, [dublin]), /row-level security/);
    const r = await as(users.work, `insert into public.posts (circle_id, type, title, body, details) values ($1, 'notice', 'Found a wallet', 'Near the station', '{"category":"lost_found"}') returning id`, [dublin]);
    noticeId = r.rows[0].id;
  });

  await test('jobs and housing need level 3; events need level 2', async () => {
    await rejects(as(users.work, `insert into public.posts (circle_id, type, title, body, details) values ($1, 'job', 'Hiring', 'Java dev', '{"kind":"opening"}')`, [dublin]), /row-level security/);
    await rejects(as(users.work, `insert into public.posts (circle_id, type, title, body, details) values ($1, 'notice', 'Room to let', 'D6', '{"category":"housing"}')`, [dublin]), /row-level security/);
    await as(users.verified, `insert into public.posts (circle_id, type, title, body, details) values ($1, 'job', 'Hiring', 'Java dev', '{"kind":"opening"}')`, [dublin]);
    await rejects(as(users.gmail, `insert into public.posts (circle_id, type, title, body, details) values ($1, 'event', 'Chai meetup', 'Come along', '{"startsAt":"2027-01-10T10:00:00Z","venue":"Cafe, Dublin 2"}')`, [dublin]), /row-level security/);
    await as(users.work, `insert into public.posts (circle_id, type, title, body, details) values ($1, 'event', 'Chai meetup', 'Come along', '{"startsAt":"2027-01-10T10:00:00Z","venue":"Cafe, Dublin 2"}')`, [dublin]);
  });

  await test('posting needs circle membership', async () => {
    await rejects(as(users.work, `insert into public.posts (circle_id, type, title, body) values ($1, 'question', 'GP help?', 'How do I register?')`, [london]), /row-level security/);
  });

  await test('posts cannot set their own status or counters', async () => {
    await rejects(as(users.work, `insert into public.posts (circle_id, type, title, body, status) values ($1, 'notice', 'Hello', 'x', 'visible')`, [dublin]), /permission denied/);
    await rejects(as(users.work, `update public.posts set reply_count = 99 where id = $1`, [noticeId]), /permission denied/);
    const r = await as(users.gmail, `update public.posts set title = 'changed' where id = $1 returning id`, [noticeId]);
    assert.equal(r.rowCount, 0, "a member edited someone else's post");
  });

  await test('level 1 can browse posts; hidden and expired posts stay hidden', async () => {
    const r = await as(users.gmail, `select id from public.posts`);
    assert.ok(r.rows.some((x) => x.id === noticeId));
    await admin.query(`insert into public.posts (circle_id, author_id, type, title, body, expires_at) values ($1, $2, 'notice', 'Old notice', 'x', now() - interval '1 day')`, [dublin, users.work]);
    await admin.query(`insert into public.posts (circle_id, author_id, type, title, body) values ($1, $2, 'notice', 'Removed notice', 'x')`, [dublin, users.verified]);
    await admin.query(`update public.posts set status = 'removed' where title = 'Removed notice'`);
    const titles = (await as(users.gmail, `select title from public.posts`)).rows.map((x) => x.title);
    assert.ok(!titles.includes('Old notice') && !titles.includes('Removed notice'));
  });

  await test('replies need level 2 and update the reply count', async () => {
    await rejects(as(users.gmail, `insert into public.replies (post_id, body) values ($1, 'Mine!')`, [noticeId]), /row-level security/);
    await as(users.other, `insert into public.replies (post_id, body) values ($1, 'Is it brown?')`, [noticeId]);
    const r = await admin.query(`select reply_count from public.posts where id = $1`, [noticeId]);
    assert.equal(r.rows[0].reply_count, 1);
  });

  let eventId;
  await test('RSVPs respect event capacity and are events-only', async () => {
    const r = await as(users.verified, `insert into public.posts (circle_id, type, title, body, details) values ($1, 'event', 'Chai meetup', 'Come along', '{"startsAt":"2026-12-01T18:00:00Z","venue":"Cafe","capacity":1}') returning id`, [dublin]);
    eventId = r.rows[0].id;
    await as(users.work, `insert into public.event_rsvps (post_id) values ($1)`, [eventId]);
    await rejects(as(users.other, `insert into public.event_rsvps (post_id) values ($1)`, [eventId]), /full/);
    await rejects(as(users.other, `insert into public.event_rsvps (post_id) values ($1)`, [noticeId]), /Only events/);
    const c = await admin.query(`select rsvp_count from public.posts where id = $1`, [eventId]);
    assert.equal(c.rows[0].rsvp_count, 1);
    const mine = await as(users.other, `select * from public.event_rsvps`);
    assert.equal(mine.rowCount, 0, 'saw another member’s RSVP');
  });

  await test('chat requests need level 2', async () => {
    await rejects(as(users.gmail, `insert into public.chat_requests (to_id, note) values ($1, 'Hello, can we talk about jobs?')`, [users.work]), /row-level security/);
  });

  let convId;
  await test('accepting a request opens a private conversation', async () => {
    const req = await as(users.work, `insert into public.chat_requests (to_id, note) values ($1, 'Hi Meera, saw your job post. Can I ask about the team?') returning id`, [users.verified]);
    await rejects(as(users.other, `select public.respond_chat_request($1, true)`, [req.rows[0].id]), /no longer open/);
    const r = await as(users.verified, `select public.respond_chat_request($1, true) as conv`, [req.rows[0].id]);
    convId = r.rows[0].conv;
    const msgs = await as(users.work, `select body from public.messages where conversation_id = $1`, [convId]);
    assert.equal(msgs.rowCount, 1);
    await as(users.verified, `insert into public.messages (conversation_id, body) values ($1, 'Sure, ask away')`, [convId]);
    const outsider = await as(users.other, `select * from public.messages where conversation_id = $1`, [convId]);
    assert.equal(outsider.rowCount, 0, 'an outsider read the conversation');
    await rejects(as(users.other, `insert into public.messages (conversation_id, body) values ($1, 'butting in')`, [convId]), /row-level security/);
    await rejects(as(users.work, `insert into public.chat_requests (to_id, note) values ($1, 'Another request to the same person')`, [users.verified]), /already have a chat/);
  });

  await test('members cannot create conversations or send as someone else', async () => {
    await rejects(as(users.other, `insert into public.conversations default values`), /permission denied/);
    await rejects(as(users.work, `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'spoof')`, [convId, users.verified]), /permission denied/);
  });

  await test('blocking hides posts and profiles both ways and stops messages', async () => {
    await as(users.verified, `insert into public.blocks (blocked_id) values ($1)`, [users.work]);
    await rejects(as(users.work, `insert into public.messages (conversation_id, body) values ($1, 'are you there?')`, [convId]), /row-level security/);
    const posts = await as(users.verified, `select id from public.posts where author_id = $1`, [users.work]);
    assert.equal(posts.rowCount, 0, 'blocker still sees blocked member’s posts');
    const prof = await as(users.work, `select id from public.profiles where id = $1`, [users.verified]);
    assert.equal(prof.rowCount, 0, 'blocked member still sees the blocker’s profile');
    await rejects(as(users.work, `insert into public.chat_requests (to_id, note) values ($1, 'please unblock me, it was a mistake')`, [users.verified]), /row-level security|already have a chat/);
    await as(users.other, `insert into public.blocks (blocked_id) values ($1)`, [users.gmail]);
    await rejects(as(users.gmail, `select 1`).then(() => as(users.work, `insert into public.blocks (blocked_id) values ($1)`, [users.work])), /violates check constraint|row-level security/);
    await as(users.other, `delete from public.blocks where blocked_id = $1`, [users.gmail]);
    const seenBlocks = await as(users.work, `select * from public.blocks`);
    assert.equal(seenBlocks.rowCount, 0, 'blocked member can see who blocked them');
  });

  await test('reports are private to the reporter', async () => {
    await as(users.other, `insert into public.reports (target, target_id, reason) values ('post', $1, 'Looks like a scam')`, [noticeId]);
    const r = await as(users.work, `select * from public.reports`);
    assert.equal(r.rowCount, 0);
  });

  await test('service requests are private, staff-only status, withdrawable until started', async () => {
    const r = await as(users.gmail, `insert into public.service_requests (service_id, tier, for_whom, location, timing, details) values ('care-visit', 'essential', 'parent', 'Pune', 'This month', 'Weekly visits for my mother please') returning id, status`);
    assert.equal(r.rows[0].status, 'received');
    const id = r.rows[0].id;
    const other = await as(users.work, `select * from public.service_requests`);
    assert.equal(other.rowCount, 0, "another member saw someone's request");
    await rejects(as(users.gmail, `insert into public.service_requests (service_id, tier, for_whom, details, status) values ('buddy', 'basic', 'me', 'A first coffee please', 'done')`), /permission denied/);
    await rejects(as(users.gmail, `update public.service_requests set status = 'done' where id = $1`, [id]), /permission denied/);
    await rejects(as(users.gmail, `insert into public.service_requests (service_id, tier, for_whom, details, contact_method) values ('buddy', 'basic', 'me', 'Call me about this', 'phone')`), /check constraint/);
    await admin.query(`update public.service_requests set status = 'in_progress' where id = $1`, [id]);
    const del = await as(users.gmail, `delete from public.service_requests where id = $1 returning id`, [id]);
    assert.equal(del.rowCount, 0, 'withdrew a request already in progress');
    const r2 = await as(users.gmail, `insert into public.service_requests (service_id, tier, for_whom, details) values ('buddy', 'basic', 'me', 'A first coffee please') returning id`);
    const del2 = await as(users.gmail, `delete from public.service_requests where id = $1 returning id`, [r2.rows[0].id]);
    assert.equal(del2.rowCount, 1);
  });

  await test('message rate limit stops floods', async () => {
    const req = await as(users.other, `insert into public.chat_requests (to_id, note) values ($1, 'Hi Asha, quick question about Dublin') returning id`, [users.gmail]);
    const c = (await as(users.gmail, `select public.respond_chat_request($1, true) as conv`, [req.rows[0].id])).rows[0].conv;
    for (let i = 0; i < 29; i++) await as(users.other, `insert into public.messages (conversation_id, body) values ($1, $2)`, [c, `msg ${i}`]);
    await rejects(as(users.other, `insert into public.messages (conversation_id, body) values ($1, 'one too many')`, [c]), /too quickly/);
  });

  // ---------------------------------------------------------------- invite codes
  const newMember = async (email, name) => {
    const id = randomUUID();
    await admin.query(`insert into auth.users (id, email) values ($1, $2)`, [id, email]);
    await profile(id, name);
    return id;
  };
  const level = async (id) => (await admin.query(`select trust_level from public.profiles where id = $1`, [id])).rows[0].trust_level;

  await test('members cannot read or change invite codes or redemptions', async () => {
    await admin.query(`insert into public.invites (code, note, max_uses) values ('DUBLIN-BETA', 'first testers', 2)`);
    await rejects(as(users.gmail, `select * from public.invites`), /permission denied/);
    await rejects(as(users.gmail, `insert into public.invites (code) values ('MY-OWN-CODE')`), /permission denied/);
    await rejects(as(users.gmail, `update public.invites set max_uses = 1000`), /permission denied/);
    await rejects(as(users.gmail, `select * from public.invite_redemptions`), /permission denied/);
    await rejects(as(users.gmail, `insert into public.invite_redemptions (user_id, code) values (auth.uid(), 'DUBLIN-BETA')`), /permission denied/);
    await rejects(as('anon', `select public.redeem_invite('DUBLIN-BETA')`), /permission denied/);
  });

  await test('a valid invite code lifts a Gmail member to level 2, once per member', async () => {
    const a = await newMember('i1@gmail.com', 'Invitee One');
    assert.equal(await level(a), 1);
    const r = await as(a, `select public.redeem_invite(' dublin-beta ') as lvl`);
    assert.equal(r.rows[0].lvl, 2);
    assert.equal(await level(a), 2);
    // asking again is harmless and does not use up another seat
    await as(a, `select public.redeem_invite('DUBLIN-BETA')`);
    const u = await admin.query(`select uses from public.invites where code = 'DUBLIN-BETA'`);
    assert.equal(u.rows[0].uses, 1);
    // and they can now do what level 2 can
    await as(a, `insert into public.posts (circle_id, type, title, body) values ($1, 'question', 'Best GP near Rathmines?', 'Taking new patients?')`, [dublin]);
  });

  await test('codes stop working when used up, expired or unknown', async () => {
    const b = await newMember('i2@gmail.com', 'Invitee Two');
    const c = await newMember('i3@gmail.com', 'Invitee Three');
    assert.equal((await as(b, `select public.redeem_invite('DUBLIN-BETA') as lvl`)).rows[0].lvl, 2);
    assert.equal((await as(c, `select public.redeem_invite('DUBLIN-BETA') as lvl`)).rows[0].lvl, 0); // max_uses = 2
    await admin.query(`insert into public.invites (code, expires_at) values ('OLD-CODE-1', now() - interval '1 day')`);
    assert.equal((await as(c, `select public.redeem_invite('OLD-CODE-1') as lvl`)).rows[0].lvl, 0);
    assert.equal((await as(c, `select public.redeem_invite('NOT-A-CODE') as lvl`)).rows[0].lvl, 0);
    assert.equal(await level(c), 1);
  });

  await test('a host code gives level 3 and a code never lowers a level', async () => {
    await admin.query(`insert into public.invites (code, level, max_uses) values ('HOST-CODE-1', 3, 5), ('DUBLIN-ALL', 2, 5)`);
    const d = await newMember('i4@gmail.com', 'Host Person');
    assert.equal((await as(d, `select public.redeem_invite('HOST-CODE-1') as lvl`)).rows[0].lvl, 3);
    const e = await newMember('i5@acme.ie', 'Work Person'); // already level 2 from a work email
    assert.equal((await as(e, `select public.redeem_invite('DUBLIN-ALL') as lvl`)).rows[0].lvl, 2);
    await as(d, `insert into public.posts (circle_id, type, title, body, details) values ($1, 'job', 'Hiring a nurse', 'Dublin clinic', '{"kind":"opening"}')`, [dublin]);
  });

  await test('guessing codes is rate limited', async () => {
    const f = await newMember('i6@gmail.com', 'Guesser');
    for (let i = 0; i < 10; i++) await as(f, `select public.redeem_invite($1)`, [`GUESS-${i}-ABC`]);
    await rejects(as(f, `select public.redeem_invite('DUBLIN-ALL')`), /Too many tries/);
    assert.equal(await level(f), 1);
  });

  await test('a member needs a profile before using a code', async () => {
    const ghost = randomUUID();
    await admin.query(`insert into auth.users (id, email) values ($1, 'ghost@gmail.com')`, [ghost]);
    await rejects(as(ghost, `select public.redeem_invite('DUBLIN-ALL')`), /Finish setting up/);
  });

  // ---------------------------------------------------------------- terms acceptance
  await test('members record which rules version they accepted; the time is stamped by the database', async () => {
    const t = await newMember('terms1@gmail.com', 'Terms Person');
    const before = (await admin.query(`select terms_version, terms_accepted_at from public.profiles where id = $1`, [t])).rows[0];
    assert.equal(before.terms_version, null);
    assert.equal(before.terms_accepted_at, null);
    await as(t, `update public.profiles set terms_version = '2026-11-03' where id = auth.uid()`);
    const after = (await admin.query(`select terms_version, terms_accepted_at from public.profiles where id = $1`, [t])).rows[0];
    assert.equal(after.terms_version, '2026-11-03');
    assert.ok(after.terms_accepted_at);
    // editing the profile later does not change the recorded time
    await as(t, `update public.profiles set bio = 'Hello' where id = auth.uid()`);
    const again = (await admin.query(`select terms_accepted_at from public.profiles where id = $1`, [t])).rows[0];
    assert.equal(again.terms_accepted_at.getTime(), after.terms_accepted_at.getTime());
  });

  await test('members cannot back-date acceptance or use a malformed version', async () => {
    const t = await newMember('terms2@gmail.com', 'Terms Two');
    await rejects(as(t, `update public.profiles set terms_accepted_at = '2020-01-01' where id = auth.uid()`), /permission denied/);
    await rejects(as(t, `update public.profiles set terms_version = 'latest' where id = auth.uid()`), /check constraint|violates/);
    const id = randomUUID();
    await admin.query(`insert into auth.users (id, email) values ($1, 'terms3@gmail.com')`, [id]);
    await as(id, `insert into public.profiles (id, display_name, city, country, terms_version) values ($1, 'Signs Up', 'Dublin', 'IE', '2026-11-03')`, [id]);
    const r = (await admin.query(`select terms_accepted_at from public.profiles where id = $1`, [id])).rows[0];
    assert.ok(r.terms_accepted_at);
  });

  // ---------------------------------------------------------------- launch content
  await test('the launch content script runs, is safe to run twice and posts as the founder', async () => {
    const founder = await newMember('turtletech.labs@gmail.com', 'Founder');
    const seed = readFileSync(join(here, '..', 'seed', 'launch_content.sql'), 'utf8');
    await admin.query(seed);
    const first = (await admin.query(`select count(*)::int as n from public.posts where author_id = $1`, [founder])).rows[0].n;
    // 5 posts in each of 2 city circles + 1 welcome note in each of 7 other circles
    assert.equal(first, 5 * 2 + 7);
    await admin.query(seed);
    const second = (await admin.query(`select count(*)::int as n from public.posts where author_id = $1`, [founder])).rows[0].n;
    assert.equal(second, first);
    const hidden = (await admin.query(`select count(*)::int as n from public.posts where author_id = $1 and status <> 'visible'`, [founder])).rows[0].n;
    assert.equal(hidden, 0);
    // the posting limit is back on afterwards, and the welcome note sits on top
    const trig = (await admin.query(`select tgenabled from pg_trigger where tgname = 'posts_before_insert'`)).rows[0].tgenabled;
    assert.equal(trig, 'O');
    const top = (await admin.query(`select title from public.posts p join public.circles c on c.id = p.circle_id where c.slug = 'dublin' order by p.created_at desc limit 1`)).rows[0].title;
    assert.match(top, /^Welcome to Sangam/);
  });

  await test('deleting an account removes the member and their content', async () => {
    await as(users.other, `select public.delete_my_account()`);
    const p = await admin.query(`select count(*)::int as n from public.profiles where id = $1`, [users.other]);
    const rep = await admin.query(`select count(*)::int as n from public.replies where author_id = $1`, [users.other]);
    assert.equal(p.rows[0].n + rep.rows[0].n, 0);
    const count = await admin.query(`select reply_count from public.posts where id = $1`, [noticeId]);
    assert.equal(count.rows[0].reply_count, 0);
  });

  await admin.end();
}

main()
  .catch((e) => results.push(['FAIL', 'setup', e.message]))
  .finally(async () => {
    await server.stop().catch(() => {});
    rmSync(dataDir, { recursive: true, force: true });
    for (const [status, name, err] of results) console.log(`${status === 'ok' ? 'ok  ' : 'FAIL'}  ${name}${err ? `\n      ${err}` : ''}`);
    const failed = results.filter((r) => r[0] !== 'ok').length;
    console.log(`\n${results.length - failed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  });
