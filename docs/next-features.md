# Next features

Two lanes so Claude Code and Codex can work at the same time without editing
the same files. Prompts for each item are in `parallel-build-prompts.md`.

| # | Feature | Lane | Touches | Needs first |
| --- | --- | --- | --- | --- |
| A1 | ID checks with Didit (level 3) | Claude Code | new migration, `supabase/functions/`, Profile screen | Didit account and API key |
| A2 | Vouching: two level-3 members lift someone to level 2 | Claude Code | new migration, Member screen | — |
| A3 | Moderation: AI pre-screen, admin role, review queue | Claude Code | new migration, `supabase/functions/` | Gemini API key |
| A4 | Basic tier: entitlements and payment webhook | Claude Code | new migration, `supabase/functions/`, paywall screen | Payment provider chosen |
| A5 | Notifications for chat requests (quiet by default) | Claude Code | `supabase/functions/`, settings screen | — |
| B1 | Installable web app (manifest, icons, offline shell, install hint) | Codex | `app/public/`, `app/app.json`, new screen | — |
| B2 | Edit and delete your own posts and replies | Codex | api adapters, Post screen | — |
| B3 | Search posts in your circles | Codex | api adapters, Home screen | — |
| B4 | Staff side of service requests: status updates and replies (the member-side Services tab shipped 3 Nov) | Codex | `admin/` | A3, B6 |
| B5 | Member perks list (Basic) | Codex | new migration, new screen | A4 |
| B6 | Admin console (Refine) | Codex | new `admin/` folder | A3 |
| B7 | Smaller web bundle (icon imports, tree shaking) | Codex | imports only | — |
| B8 | Landing page with waitlist | Codex | new `web/` folder, new migration | — |

Rules for both lanes:
- One feature per branch and pull request. Branch names: `a1-id-checks`, `b3-search`.
- Anything under `supabase/migrations/`, `app/src/lib/api/` or safety code
  needs the founder's review (CODEOWNERS).
- If two features need the same file, the one that merges second rebases.
