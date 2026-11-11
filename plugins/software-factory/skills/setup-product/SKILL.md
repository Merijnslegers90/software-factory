---
name: setup-product
description: Start a new product in the factory, or take an existing site into it. Route A builds a new product from the official SvelteKit starter up to its first deploy; route B takes in an existing site in two pull requests (take in without changing the site, then update to the factory's stack), with the fixed page and accessibility tests and a screenshot comparison of live against preview. Use this when a new product, site or repo starts, or when someone asks to bring a site into the factory.
---

# Setting up a product

Every product of the factory looks the same underneath: the stack of F-0010,
the shared packages, the central CI, the plugin, a `CLAUDE.md` with its kind
(F-0013), and the fixed tests. This skill gets a product there, new or
existing.

Read the factory decisions first (skill `software-factory:factory-decisions`)
and the way of working (skill `software-factory:way-of-working`). Everything
in this folder is used below:

- `templates/CLAUDE.md`: the outline of the product's `CLAUDE.md`.
- `templates/e2e/` and `templates/playwright.config.ts`: the fixed tests.
- `compare/compare.mjs`: the screenshot comparison.

**First ask the owner:** a new product, or an existing site? Then follow
route A or route B. Both end at "Finishing".

## Route A: a new product

### A1. The starter

```bash
npx sv create <name> --template minimal --types ts \
  --add tailwindcss eslint prettier vitest playwright --install pnpm
```

Then, in the new folder, update to the factory's stack (F-0010): SvelteKit 3
with `npx sv migrate sveltekit-3` if the starter is still on 2, TypeScript 6,
Node 22.17 or later, and `@sveltejs/adapter-vercel` in place of
`adapter-auto`.

- **`vite.config.ts`** holds the Svelte and Kit settings (`sveltekit({ ... })`
  with the adapter); remove `svelte.config.js`.
- **`#lib/...` imports:** in `package.json`, `"imports": { "#lib/*":
"./src/lib/*" }`, and use it instead of `$lib`.
- **`src/env.ts`** with `defineEnvVars`, every variable with a schema that
  accepts a missing value (`input ?? ''`), read from `$app/env/private` or
  `$app/env/public`. Every variable also in `.env.example` with a fake value.
- **Fixed scripts:** `lint` (`prettier --check . && eslint .`), `check`,
  `test`, `build`, `test:e2e` (`playwright test`).

### A2. The shared parts

- `pnpm add -D @merijnslegers/config @sveltejs/load-config`, then
  `prettier.config.js`, `eslint.config.js` and `tsconfig.json` as in
  `packages/README.md` of the factory.
- `.github/workflows/kwaliteitscontrole.yml` (`quality.yml` in an English
  product): on push to `main` and on every pull request, calling
  `Merijnslegers90/software-factory/.github/workflows/quality.yml@v1` with
  `e2e: true`. If `package.json` has no `packageManager`, pass `pnpm-version`.
- `.claude/settings.json` with the factory's marketplace and the plugin
  `software-factory@software-factory` on, as in the factory's README.
- `AGENTS.md`: a few lines for other agents that point to `CLAUDE.md`, the
  project decisions and the factory decisions.

### A3. The kind

Ask the owner which kind of F-0013 this product is, and set up what it needs:

- **A site that hardly changes:** content in code under `src/lib/content/`.
  Nothing more.
- **A site the customer edits:** the skill `add-sanity`, after this skill.
- **A product with a shop or business behind it:** a Supabase project of its
  own (F-0009), `@merijnslegers/migrations` with `vercel-build`, and
  `@merijnslegers/admin` for the admin (F-0011). Migrations with the skill
  `new-migration`.

### A4. `CLAUDE.md`

From `templates/CLAUDE.md`, in the product's language. Fill in every part,
and remove what does not apply. The kind goes in, with what follows from it.

### A5. The fixed tests

See "The fixed tests" below. A new product starts with an empty
`e2e/known-issues.ts`.

### A6. Vercel

```bash
vercel link            # in the owner's team; creates the project
vercel git connect     # links the GitHub repo, so every pull request gets a preview
vercel domains add <domain> <project>   # only when the owner has a domain
```

Without a domain the product runs on its `vercel.app` address. Variables go
in the project settings, never in the repo. The first production deploy
comes from merging the first pull request, like every change.

## Route B: an existing site

Two pull requests. The site keeps working in between, and each can be
reviewed on its own. Before you start, read the site: `package.json`,
`svelte.config.js`, `src/routes`, where it fetches content, which variables
it reads, and any `AGENTS.md`, `README.md` or notes.

### B1. Pull request 1: take in, without changing the site

Nothing a visitor sees changes in this pull request. It adds the factory
around the site:

- **`CLAUDE.md`** from `templates/CLAUDE.md`, with the kind of F-0013. Until
  pull request 2, its "Stack" section describes the stack the site has now
  (SvelteKit 2, variables through `$env/dynamic`), and the move to the
  factory's stack goes under "Not yet like the factory". An
  `AGENTS.md` with useful content moves into `CLAUDE.md`; `AGENTS.md` then
  points to it, as in route A.
- **`.claude/settings.json`** with the plugin, as in route A.
- **The central CI**, as in route A.
- **`@merijnslegers/config` 0.x**, the version for SvelteKit 2 (F-0010), with
  its prettier, eslint and tsconfig settings. Formatting the whole repo with
  it is part of this pull request; it changes no behaviour.
- **Variables** are read at runtime, through `$env/dynamic/private` or
  `$env/dynamic/public`, never `$env/static/*` (F-0005). Every one is in
  `.env.example` with a fake value. A feature without its variable is off,
  and the build does not break.
- **The fixed tests** (below). Run the accessibility test twice: once
  against the live site (`E2E_BASE_URL=<live address>`, with
  `E2E_FROM_SITEMAP=1` for a CMS site), and once locally, as CI runs it, with
  the fake values and no CMS content. Put every issue either run finds in
  `e2e/known-issues.ts`, with the element (`target`) where axe names one, and
  a short note. The take-in does not wait for them.
- **"Not yet like the factory"** in `CLAUDE.md`: every place the site differs
  from the decisions. For each, say whether pull request 2 fixes it, a project
  decision covers it (skill `write-adr`), or it is a point for later.
- **A Storyblok token** that is hardcoded, or used in a load that also runs in
  the browser (`+page.ts`, `+layout.ts`): move the fetching to a server load
  (`+page.server.ts`, `+layout.server.ts`), read the token from
  `$env/dynamic/private`, split it into a public token and a preview token,
  and ask the owner to create new tokens in Storyblok and revoke the old one
  (F-0014). This is the one change in behaviour pull request 1 may make: a
  token in the git history must be replaced anyway. Check afterwards that
  production still shows published content and previews still show drafts.

Check: CI is green, the site behaves as before, and the owner has seen the
"Not yet like the factory" list.

### B2. Pull request 2: update to the factory's stack

- `npx sv migrate sveltekit-3`, then TypeScript 6, Node 22.17 or later, and
  `@merijnslegers/config` 1.x with its tsconfig next to `$app/tsconfig`.
  The migration also replaces `$lib` with `#lib` in Markdown, so check
  `CLAUDE.md` and other docs afterwards. It leaves a `MIGRATION_TASKS.md`;
  work through it and remove it.
- The Svelte and Kit settings from `svelte.config.js` into `vite.config.ts`;
  remove `svelte.config.js`.
- Every variable in `src/env.ts` with `defineEnvVars`, read from
  `$app/env/private` or `$app/env/public` instead of `$env/dynamic/*`.
- `#lib/...` imports instead of `$lib`.
- What is left of Svelte 4 syntax (`export let`, `$:`, `on:click`) to runes.
- `adapter-vercel` only; remove `adapter-auto`.
- Remove from "Not yet like the factory" what this pull request fixed.

**A dependency without a version for SvelteKit 3:** stop, name it to the
owner, and leave the site on pull request 1 until there is one. Record it
under "Not yet like the factory". A peer range that only names SvelteKit 2
counts too, even when the code would work. Run the migration locally first
(without pushing), so you can tell the owner whether the dependency really
breaks, which part of it, and what a way around it would look like. The
owner decides whether to go ahead; put that decision in the pull request.

Before merging, the screenshot comparison (below) runs against the preview
of this pull request, and every difference is explained or fixed.

## The fixed tests

Every product has them, run by `test:e2e` in CI (F-0007, F-0010).

1. `pnpm add -D @playwright/test @axe-core/playwright`.
2. Copy `templates/playwright.config.ts` to the repo root and
   `templates/e2e/*` to `e2e/`. Translate the comments and test names to the
   product's language.
3. Fill `PAGES` in `e2e/pages.ts` with every public page. Leave out pages
   behind a login or that only show a form result, with a comment saying so.
   Name the external services of the product in `EXTERNAL_NOISE` in
   `pages.spec.ts`.
4. Locally and in CI the tests run against the dev server with the fake
   values from `.env.example`. A page that needs a CMS or a database must
   still render then, even if empty.
5. Against a preview or the live site: `E2E_BASE_URL=<address>`; for a CMS
   site add `E2E_FROM_SITEMAP=1`, so pages that only exist in the CMS are
   checked too. A preview behind Vercel's deployment protection needs
   `E2E_BYPASS_TOKEN` (Vercel, project settings, Deployment Protection,
   Protection Bypass for Automation), passed in when you run it and never
   written down. Playwright then sends that header on every request, also to
   other hosts; if a page calls an API or font host from the browser, that
   host may refuse it and the test reports a console error that is not the
   site's fault. The screenshot comparison sends it to the preview's own host
   only.
6. `E2E_FROM_SITEMAP=1` fetches the sitemap with Node's own `fetch`, which
   ignores `HTTPS_PROXY`. Behind a proxy, such as in a cloud session, add
   `NODE_USE_ENV_PROXY=1`. The same holds for `--sitemap` in the screenshot
   comparison.

## The screenshot comparison

Compares every page of the live site with a preview, on a phone and a
desktop width, and writes a report with the pages that differ and an image
of each difference: the differences in red, over a faded copy of the live
page. Run it from the product's repo, where Playwright is installed:

```bash
node <this skill>/compare/compare.mjs \
  --live https://www.<domain> --preview https://<preview address> \
  --pages e2e/pages.ts --out compare-report
```

- `--pages e2e/pages.ts` reads the `PAGES` list the tests use, so there is no
  copy to keep up to date; a text file with one path per line works too.
  `--sitemap` reads the live site's sitemap instead (an index is followed one
  level down).
- A protected preview: `COMPARE_BYPASS_TOKEN=<token>` in front of the
  command, never in a file. Without a bypass token, a share link works too:
  `COMPARE_SHARE_URL=<link>`, from `get_access_to_vercel_url` of the Vercel
  connector. The comparison opens it once in the preview's browser, which
  then has the cookie. The link gives anyone access for 23 hours, so it is
  never written down or posted either.
- It exits with 1 when something differs or could not be compared. Read
  `compare-report/report.md`, and look at every image. A difference can also
  be content edited on the live site in between; judge each one, and tell the
  owner which differences remain and why.
- `compare-report/` is not committed; add it to `.gitignore`.

Use it in route B, pull request 2, and in any change that should not alter
how a page looks.

## Finishing

- `lint`, `check`, `test`, `build` and `test:e2e` pass.
- The agent `factory-review` has checked the pull request; what it calls
  blocking is fixed.
- After the preview is built, the skill `preview-check` goes through it.
- The owner merges.
- When a site has been taken in, tell the owner what is left under "Not yet
  like the factory".
