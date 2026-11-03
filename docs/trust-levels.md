# Trust levels

| Level | How you get it | What it unlocks |
| --- | --- | --- |
| 1 · Email | Sign in with any email or Google | Browse every circle, read answers and guides, RSVP, SOS, accept chat requests |
| 2 · Trusted member | Sign in with an email that isn't a free webmail domain (list in `public.freemail_domains`), **enter an invite code** (see `docs/invites.md`), or be vouched for by two level-3 members (not built yet) | Post notices, questions and events, reply, send chat requests |
| 3 · ID verified | Government ID check through Didit (not built yet; an admin sets it for now) | Post jobs, referrals and housing; expert badge (admin-granted) |

Rules are enforced in the database (`required_level()`, `my_trust_level()`
and the row-level security policies) and mirrored in the demo adapter.
Members can never set their own level: the column isn't granted to them.

ID checks store only the result (level, date, provider reference), never
document images or selfies.
