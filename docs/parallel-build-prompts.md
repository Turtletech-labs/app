# Prompts for parallel builds

Paste one prompt per session. Run Lane A in Claude Code and Lane B in Codex at
the same time. Each prompt is self-contained. Before merging, give the pull
request to the other model to review ("Review this PR against AGENTS.md").

Every prompt starts with the same header:

> Read AGENTS.md first and follow it. Work on a new branch named as below.
> Keep the demo adapter in step with the live adapter. Run typecheck, unit
> tests and database tests before you finish, and list what you tested in the
> pull request.

---

## Lane A · Claude Code

### A1 · ID checks with Didit (branch `a1-id-checks`)

Add government ID verification so members can reach trust level 3.
- New migration: table `verifications` (user_id, provider, session_id, status
  pending/approved/declined, decided_at). Owner can read their own rows;
  nobody can write except the service role. Store only the result, never
  images or document numbers.
- Edge function `didit-session`: for the signed-in member, create a Didit
  verification session with `DIDIT_API_KEY` (server-side secret) and return
  the hosted URL. Rate-limit to 3 sessions per member per day.
- Edge function `didit-webhook`: verify the webhook signature with
  `DIDIT_WEBHOOK_SECRET`, update the row, and on approval set
  `profiles.trust_level = 3`.
- App: "Verify my ID" on the Profile screen opens the hosted flow with
  `expo-web-browser`, then refreshes the profile. Demo adapter: approve after
  a short delay.
- Tests: members can't insert or update `verifications`; a forged webhook is
  rejected; approval raises the level.
- Check Didit's current API docs before writing the calls; don't guess field
  names.

### A2 · Vouching (branch `a2-vouching`)

Two level-3 members can vouch for someone, lifting them to level 2.
- New migration: `vouches` (voucher_id, vouchee_id, created_at, unique pair).
  Insert only if the voucher is level 3, isn't the vouchee, isn't blocked
  either way, and has made fewer than 5 vouches in 30 days. A trigger lifts
  the vouchee to level 2 at two vouches. Vouchers see their own vouches;
  vouchees see a count only.
- App: "Vouch for {name}" on the Member screen, shown to level-3 members, with
  a confirm step explaining what vouching means.
- Tests for every rule above.

### A3 · Moderation (branch `a3-moderation`)

- New migration: `admins` (user_id) and `is_admin()`; admins can read all
  reports and set `status` on posts and replies through a security-definer
  function, logged in a `moderation_log` table.
- Edge function `screen-content`, called by a database webhook on new posts
  and replies: ask Gemini (`GEMINI_API_KEY`) whether the text is a scam,
  harassment or unsafe meeting; if flagged, hide it and file a report with the
  model's reason. Never send personal data other than the post text.
- Tests: non-admins can't read others' reports or change status.

### A4 · Basic tier (branch `a4-basic-tier`)

Only start once the payment provider is chosen (Paddle or Lemon Squeezy).
- New migration: `entitlements` (user_id, tier, valid_until, source,
  external_id). Written only by the service role.
- Edge function for the provider's webhook: verify the signature, then insert
  or extend the entitlement. Handle refunds and cancellations.
- App: a "Basic" screen (perks, host tools, scheduled check-ins), a hosted
  checkout link, and `api.getMyTier()`. Safety features are never gated.
- Tests: members can't grant themselves a tier.

### A5 · Notifications (branch `a5-notifications`)

Web push for new chat requests and accepted requests only. Off for
everything else by default. Settings screen with per-type switches. VAPID keys
in secrets. No message text in the notification body.

---

## Lane B · Codex

### B1 · Installable web app (branch `b1-pwa`)

Make the web build installable from the browser on iPhone and Android:
`app/public/manifest.json` with name, colours from `theme.ts` and icons
(192, 512, maskable), `apple-touch-icon`, a service worker that caches the app
shell, and an "Add to home screen" hint screen shown once on mobile browsers.
Verify with a Lighthouse PWA check and note the score in the PR.

### B2 · Edit and delete your own content (branch `b2-edit-delete`)

Add `updatePost`, `deletePost` and `deleteReply` to the `Api` interface and
both adapters (the database already allows authors to update title, body,
details and expiry, and to delete). Add Edit and Delete to the Post screen for
the author, with an in-page confirm (no `Alert`, it doesn't work on web).

### B3 · Search (branch `b3-search`)

A search box on the Home screen that searches titles and bodies in the
member's circles. Live: `ilike` on title and body, max 50 results. Demo:
filter in memory. Debounce 300 ms.

### B4 · Staff side of service requests (branch `b4-requests-staff`)

The member side shipped on 3 Nov (Services tab, `service_requests` table).
Add to the admin console (B6): a queue of requests by tier and urgency
(urgent services first), status changes (received, in progress, done, not
possible) through an admin-only function that also writes `staff_note`, and a
button that opens a chat with the member. Members must never see other
members' requests or staff notes about others.

### B5 · Member perks (branch `b5-perks`)

After A4. A list of partner perks (name, city, offer, how to redeem) from a
`perks` table that admins manage. Members with Basic see redemption details;
others see the offer and an upgrade link.

### B6 · Admin console (branch `b6-admin`)

After A3. A Refine app in `admin/` using the Supabase data provider: reports
queue (hide, restore, dismiss), member lookup (set trust level and expert
badge through admin-only functions), circles, and the moderation log. Sign-in
restricted to `is_admin()`.

### B7 · Smaller web bundle (branch `b7-bundle`)

Measure the web bundle (`npx expo export -p web`), then cut it: import each
`lucide-react-native` icon from its own module path or enable Expo's tree
shaking. Report before and after sizes in the PR. No behaviour changes.

### B8 · Landing page with waitlist (branch `b8-landing`)

A static page in `web/` (plain HTML and CSS, no framework) that explains the
app, the safety promise and the launch cities, with a waitlist form. New
migration: `waitlist` (email, city, created_at) with an insert-only policy for
anonymous visitors, a unique email, and a rate limit; nobody can read it
except the service role. Link to the privacy policy.
