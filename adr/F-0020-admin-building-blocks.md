# F-0020: The admin from building blocks, with the login of F-0016

- **Status:** accepted
- **Date:** 20 November 2026
- **Supersedes:** F-0016

## Context

F-0016 gave every product the same admin login, and left the screens and
their words to the project. merijnslegers.nl built five screens of its own.
Frietwagen Someren needs an admin too: it left Storyblok (its ADR 0001), so
the people who run it can no longer change a price themselves. Built again
per product, the screens drift: a fix in one admin reaches no other, and the
owner and his customers meet a different admin in every product.

An admin is the same in every product and needs no brand, so it is where
ready-made components pay off. The public site is the opposite and stays
built per product. The spec is issue #31.

## Decision

**The login stays as F-0016 decided it:**

- Every product logs in to its admin through `@merijnslegers/admin`, in one
  of two ways. **The settings choose the way:**
  - `SUPABASE_URL` or `SUPABASE_ANON_KEY` is set: **Supabase Auth**, with an
    allow list in `ADMIN_EMAILS`, as F-0011 described it.
  - Otherwise `ADMIN_USERS` has people: **HTTP Basic**, with a password per
    person.
  - Neither: nobody gets in, and the admin names what is missing (F-0005).
  - A half Supabase setup never falls back to HTTP Basic. A product with a
    database therefore keeps Supabase Auth.
- **HTTP Basic:**
  - `ADMIN_USERS` holds one entry per person, `email:hash`. The hash is
    scrypt, made with `npx @merijnslegers/admin hash <email>`. A plain
    password does not count. The password itself is stored nowhere.
  - Removing an entry locks that person out from the next deploy; changing
    one changes only that person's password.
  - The user name is the email address, so `event.locals.admin` is
    `{ email }` in both ways.
  - `<admin>/logout` answers with a 401, so the browser forgets the password.
  - After ten wrong passwords from one IP address, the admin answers with a
    429 for a quarter of an hour, per server instance.
  - No remote functions: the browser sends the password only under the admin
    path. Admin screens use form actions and endpoints under it.
- **For both ways:**
  - A request under the admin path that can change something must come from
    the site's own origin, even when SvelteKit's own check is off for a
    webhook. A webhook therefore never lives under the admin path.
  - The path is decoded before it is compared, so `/%61dmin` is the admin
    path too.
  - Every admin response gets the same headers: no framing, `noindex`,
    `no-store`, and a referrer that stays on the site.
  - The refusals of the login take the project's own words, or an empty
    body; the package returns an outcome code.
- **For Supabase Auth:** only the server talks to Supabase Auth,
  with the anon key; the cookie belongs to the admin path only; an address
  not on the list gets the same answer as a wrong password; a password link is
  used only when the password is saved.

**The screens come from building blocks in the packages:**

- **Svelte components next to their logic**, so a product takes only what it
  uses:
  - `@merijnslegers/admin/ui`: `AdminShell` (logo, menu, link to the site,
    logout, one message), `AdminOverview` (facts and links), and the parts
    `AdminMessage`, `AdminCard` and `AdminField`.
  - `@merijnslegers/admin/github/ui`: `AdminProposals` (the open pull
    requests of F-0018) and `AdminContentForm`, the form block.
  - `@merijnslegers/analytics/ui`: `AdminVisitors` and `AdminVisitorsSummary`
    (F-0015).
- **A server function next to each block** prepares its data in one call
  (`loadVisitors`, `loadVisitorsSummary`, `loadProposals`, `loadContentForm`),
  and `contentFormAction` saves the form. A page is a few lines.
- **The form block** fills one JSON file in the repo from fields the product
  describes: short text, long text, a price in euros, on and off, a link, and
  lists of items with their own fields. It starts from an open proposal, says
  per field what is wrong, never sends wrong input to GitHub, and refuses a
  file that no longer matches its fields instead of overwriting it. It saves
  through `propose()` of F-0018; the owner merges.
- **Words:** Dutch by default. A product replaces any text through the `text`
  prop of a block.
- **Look: the product's own style through a theme**, without custom work
  per block. The layout of the blocks is shared; a product sets in one place
  (`theme` on `AdminShell`) its colours, its fonts for text and headings, the
  rounding, and a light and a dark version or one of them. What it leaves out
  keeps a calm default. What a product misses becomes a new key in the
  theme, for every product. The blocks bring their own scoped CSS, so they
  need no Tailwind setup in the product, and the product's own heading styles
  do not reach them.
- **Features per product:** a product chooses its pages, its blocks and the
  fields of its forms, and switches parts of a block off through options
  (the referrers in the visitors, adding and removing items in a list).
- **Phone first and accessible:** every block works on a narrow screen and by
  keyboard, with touch targets of at least 44 pixels, and passes axe against
  WCAG 2.2 AA in the product's e2e tests.
- **No build step:** the components ship as Svelte source with the `svelte`
  export condition, and the product's SvelteKit 3 compiles them.
- **Special editors** (a Markdown blog) stay the product's, built from the
  parts.
- **This replaces what F-0015 and F-0018 say about the screen**: that the
  screen, its words and its colours belong to the project. The rest of both
  holds: how the visitor numbers are fetched and counted (F-0015), and how a
  change becomes a pull request (F-0018).

## Consequences

- A product without a database gets an admin with overview, visitors and
  content forms in a few files. A fix or improvement to a block reaches every
  product with a new version of the package.
- Every admin has the same layout in the product's own look. A product
  cannot restyle one block beyond the theme; that is the point.
- A block's props change only in a major version.
- The factory has a dev dependency for the first time: `svelte`, to render the
  components in their tests (`tests/svelte-render.mjs`). Axe runs in the
  products, which have a browser. The types of the blocks are written by
  hand; a test compares them with the props each block takes
  (`tests/svelte-types.mjs`).
- Everything F-0016 says about the login holds unchanged, including its
  weaknesses with HTTP Basic.

## In the code

- `packages/admin`: the login as in F-0016 (`src/server.js`, `src/rules.js`,
  `src/password.js`, `bin/admin.js`); `src/content-form.js` and
  `src/content-form-server.js` for the form block; `src/ui/` for the
  components. Tests in `test/`, including `content-form.test.mjs` and
  `ui.test.mjs`.
- `packages/analytics`: `src/visitors.js` and `src/ui/`, tested in
  `test/ui.test.mjs`.
- `hooks.server.ts` in every product, with `admin.handle`; the admin pages
  under `src/routes/admin/`.
