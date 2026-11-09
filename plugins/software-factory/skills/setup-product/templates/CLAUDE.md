# <Product>: project context

<!--
The outline every product's CLAUDE.md follows (skill setup-product). Write it
in the product's language: a Dutch product gets Dutch headings and text. Fill
in every <...>, and remove a section that does not apply instead of leaving it
empty. Keep it short: rules for one part go in docs/modules/, reasons in
docs/adr/. Remove this comment.
-->

<One paragraph: what the product is, for whom, and who runs it.>

## The factory

This product is built like every product of the software factory
([`Merijnslegers90/software-factory`](https://github.com/Merijnslegers90/software-factory),
public and in English). The decisions that hold for every product (F-NNNN),
the skills and the review agent are there. This file only holds what belongs
to this product.

- **The plugin is on** in `.claude/settings.json`. Read the factory decisions
  with the skill `software-factory:factory-decisions` before a choice about
  the database, an external service, keys, tests or CI.
- **Before a pull request**, the agent `software-factory:factory-review`
  checks the change (F-0007). What it calls blocking is fixed first.
- **A factory decision holds here**, unless a project decision in `docs/adr/`
  says this product deviates from it ("Deviates from: F-NNNN").
- **CI** is the central workflow `quality.yml@v1`, called from
  `.github/workflows/<name>.yml`.
- **Other coding agents** read `AGENTS.md`, which points here.

## Kind

<One of the three kinds of F-0013, with what follows from it:>

- <A site that hardly changes: content in code, in `src/lib/content/`. A change goes through a commit and a preview.>
- <A site the customer edits: Sanity (skill `add-sanity`) or Storyblok (F-0014). Who owns the account, where the customer edits, how a change goes live.>
- <A product with a shop or business behind it: its own Supabase project (F-0009), the admin login (F-0011), and the parts in docs/modules/.>

## Writing

<The language of the site, and of comments and commits. How customers are addressed.>

**The factory's writing rules hold here**: no em dashes in running text, plain
words, and how to write a pull request, commit or comment. They are in
`docs/way-of-working.md` of `software-factory`; the skill
`software-factory:way-of-working` loads them.

<What this product adds, such as a separator in page titles.>

## Stack

The factory's stack (F-0010): SvelteKit 3 (Svelte 5, runes), TypeScript 6,
Tailwind CSS 4, adapter-vercel, pnpm. Svelte and Kit settings are in
`vite.config.ts`; code from `src/lib` is imported as `#lib/...`.

**Every environment variable is in `src/env.ts`** and comes from
`$app/env/private` or `$app/env/public`. It is read when the site starts,
never at build time (F-0005), and a missing one is an empty string. A new key
goes in `src/env.ts` first, then in `.env.example`.

<External services, each with what it is for. A service that handles personal data also goes on the privacy page.>

## Not yet like the factory

<For a site that was taken in: where it still differs from the decisions, and for each item whether it is fixed in the next pull request, covered by a project decision, or a point for later. Remove this section when it is empty.>

## Commands

```bash
pnpm install
cp .env.example .env  # once; the fake values are enough for dev and tests
pnpm dev
pnpm run check
pnpm run lint
pnpm run test
pnpm run test:e2e
pnpm run build
```

## Tests

- **Unit** (`src/**/*.test.ts`, vitest): <what is pure and tested>.
- **E2E** (`e2e/`, Playwright): `pages.spec.ts` opens every page in
  `e2e/pages.ts`; `accessibility.spec.ts` puts them through axe against WCAG
  2.2 AA, on a phone and a desktop width. Known issues from the take-in are in
  `e2e/known-issues.ts`; a new page is added to `e2e/pages.ts`.
