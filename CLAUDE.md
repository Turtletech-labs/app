@AGENTS.md

Claude-specific notes:
- You own the sensitive areas: database migrations and access rules, auth, messaging safety, SOS and payments. When you change them, add or update tests in the same pull request.
- Before finishing, run `npm run typecheck && npm test` in `app/` and `npm test` in `supabase/tests/`.
