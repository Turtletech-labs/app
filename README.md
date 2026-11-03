# Sangam (working name)

A verified community for Indians abroad and their families back home: city and
professional circles, a notice board, expert questions, jobs and referrals,
events, request-to-chat messaging, and safety tools (SOS, "I'm safe"
check-ins, an emergency card). Launching in Dublin and London.

This is the MVP. It runs on iOS, Android and the web from one Expo codebase,
with Supabase for sign-in and data.

## Try it in two minutes (no accounts needed)

```bash
cd app
npm install
EXPO_PUBLIC_DEMO=1 npx expo start --web
```

Demo mode uses built-in sample data. Any 6-digit code signs you in.

## What's in the MVP

| Area | What works |
| --- | --- |
| Sign-in | Email code or Google; profile with city, work, college and home state; account deletion |
| Trust levels | 1 = email, 2 = work or university email, 3 = ID verified (set by an admin until ID checks ship) |
| Circles | Auto-joined city circle; join profession, alumni, life-stage and home-state circles |
| Posts | Notices (expire automatically), questions with expert answers, jobs and referrals, events with RSVP and capacity |
| Messages | Request-to-chat, accept or decline, no forwarding, scam warnings, block and report everywhere, rate limits |
| Safety | Hold-to-call the local emergency number, alert trusted contacts with your location by WhatsApp or SMS, "I'm safe" check-ins, emergency card stored on the phone |
| Services | Four tiers (Free, Basic, Essential, Emergency) and 20 requestable services for settling in, parents in India, property, tax and legal (through regulated partners), occasions and urgent help; members track or withdraw their requests |
| Guides | Dublin and London: first 90 days, with official links (inside the Services tab) |

What's next is in [docs/next-features.md](docs/next-features.md), with
ready-to-paste prompts for Claude Code and Codex in
[docs/parallel-build-prompts.md](docs/parallel-build-prompts.md).

## Connect a real backend (Supabase, free plan)

1. Create a Supabase project in the **London (eu-west-2)** region.
2. Apply the migrations in order: paste each file from `supabase/migrations/`
   into the SQL editor and run it, or use the Supabase CLI:
   `npx supabase link --project-ref <ref>` then `npx supabase db push`.
3. Auth settings:
   - Email: enable email sign-in. Edit the "Magic link" email template so it
     shows the code: include `{{ .Token }}`.
   - Google: add a Google OAuth client and enable the Google provider.
   - Add your web address (and `sangam://auth-callback` for the phone apps)
     to the redirect URLs.
4. Copy `app/.env.example` to `app/.env` and fill in the project URL and the
   **anon** key. Never use the service-role key in the app.
5. Make someone ID-verified (level 3) or an expert from the SQL editor until
   ID checks ship:
   `update profiles set trust_level = 3, is_expert = true where id = '<user id>';`

## Put the web app online (Cloudflare Pages, free)

- Build command: `cd app && npm ci && npx expo export --platform web --output-dir dist`
- Output directory: `app/dist`
- Environment variables: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Tests

```bash
cd app && npm run typecheck && npm test        # 20 unit tests
cd supabase/tests && npm install && npm test   # 20 database rule tests
```

The database tests start a throwaway Postgres, apply the migrations with a
small stand-in for Supabase's auth schema, and check what each kind of member
can and can't do: trust levels, blocking, private chats, rate limits and
account deletion.

## Repository layout

```text
app/                 Expo app (iOS, Android, web)
  src/lib/api/       one interface, two adapters: live (Supabase) and demo
  src/lib/safety.ts  emergency numbers, scam warnings, SOS messages (tested)
  src/screens/       one file per screen
supabase/
  migrations/        schema and every access rule
  tests/             database rule tests
docs/                trust levels, next features, prompts for parallel builds
```

## Safety note

This app is not an emergency service. SOS dials your local emergency number
and helps you message people you trust; it does not dispatch anyone.
