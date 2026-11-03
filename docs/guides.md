# Newcomer guides

The guides live in `app/src/content/guides.ts`. There is one guide per country,
because the rules are the same in every city (Ireland for Dublin, UK for
London). A guide is an ordered list of topics. Members see them as numbered
tiles, and each tile opens its own page.

## Order

Topics are listed in the order people usually need them. Ireland: getting
around, immigration permission, PPS number, tax, doctor and insurance, out of
hours and A&E, Indian Embassy. The test in `app/src/lib/__tests__/guides.test.ts`
keeps the first few in that order, so change the test on purpose if you change
the order. "In an emergency" is not a tile. It is always shown at the top.

## What each topic has

- `intro`: why it matters, in a sentence or two.
- `steps`: what to do, in order.
- `bring`: documents to have ready.
- `contact`: addresses, phone numbers and emails, as plain text.
- `tips`: the practical things the official page does not spell out. This is
  what makes the guides worth using, so keep adding to it.
- `watchOut`: scams and mistakes.
- `links`: official sources first. Use `https:` for pages and `mailto:` for emails.

## Adding or changing a tip

1. Confirm it against the official source, or against two members who have done
   it recently. A wrong tip about visas or tax does real harm, so if you cannot
   confirm it, leave it out.
2. Write it in your own words. Plain, short, friendly British English.
3. Name the source in your pull request.
4. Update `CHECKED` at the top of the file and run the tests.

## Using community sources

Reddit (for example Indians in Dublin), boards.ie and Facebook groups are good
for finding out what newcomers actually ask. Use them to decide what to write,
then confirm each answer as above. Do not copy posts. The text belongs to the
people who wrote it, and the sites have terms on copying. Do not keep usernames
or quotes in the repo.

## Re-checking

Rules change. Before each release, re-open the official links in every topic and
check the fees, documents and booking steps still match. Dated facts that need
the closest watch: the immigration registration fee and documents (Ireland),
PPS number application steps, and the Indian Embassy contact details.
