# F-0016: One admin login, through Supabase Auth or HTTP Basic per person

- **Status:** superseded by F-0020
- **Date:** 17 November 2026
- **Supersedes:** F-0011

## Context

F-0011 gave every admin a login through Supabase Auth, and replaced the HTTP
basic auth with one shared password that the first products had, for three
reasons: locking out one person meant changing the password for everyone, the
site did not know who was signed in, and there was no way to log out.

Since then, not every admin needs a database:

- F-0015 shows visitor numbers in the admin of every product. They come from
  Vercel, not from a database, yet F-0013 gave a site without a database no
  admin at all.
- Adding content through GitHub, or small settings and files in Vercel Blob or
  Edge Config, needs no Supabase either.
- merijnslegers.nl runs without a database (its ADR 0001) and kept its own
  basic auth with one shared password, next to the package.

A Supabase project only for the login costs a slot on the free plan, or
compute on a paid one (F-0009), and a free project pauses after a week
without activity. The first two problems of the shared password come from it
being shared, not from HTTP Basic: a password per person solves them without
a database.

## Decision

- Every product logs in to its admin through `@merijnslegers/admin`, in one
  of two ways. **The settings choose the way:**
  - `SUPABASE_URL` or `SUPABASE_ANON_KEY` is set: **Supabase Auth**, with an
    allow list in `ADMIN_EMAILS`, exactly as F-0011 described it.
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
- **For both ways, as in F-0011:**
  - A request under the admin path that can change something must come from
    the site's own origin, even when SvelteKit's own check is off for a
    webhook. A webhook therefore never lives under the admin path.
  - The path is decoded before it is compared, so `/%61dmin` is the admin
    path too.
  - Every admin response gets the same headers: no framing, `noindex`,
    `no-store`, and a referrer that stays on the site.
  - The screens and their words belong to the project. The package returns an
    outcome code or takes the project's text for its refusals.
- **For Supabase Auth, as in F-0011:** only the server talks to Supabase Auth,
  with the anon key; the cookie belongs to the admin path only; an address
  not on the list gets the same answer as a wrong password; a password link is
  used only when the password is saved.

## Consequences

- A site without a database can have an admin, for visitor numbers and for
  what the next decisions add (content through GitHub, Vercel Blob or Edge
  Config). F-0017 says so in the kinds of product.
- Who may enter is changed in Vercel's environment variables, and holds from
  the next deploy, in both ways.
- HTTP Basic is weaker than Supabase Auth in three places, accepted for a
  product without a database:
  - Logging out works in most browsers; some keep the password until they are
    closed.
  - Counting wrong passwords per server instance is less than a counter in
    a database. scrypt makes every attempt slow besides.
  - A forgotten password is a new entry in Vercel and a deploy; there is no
    password link.
- A product that gets a database later moves to Supabase Auth by setting its
  Supabase variables; `ADMIN_USERS` is then ignored, with a warning in the log.
- Everyone on the list may do everything in the admin. Roles are a new
  decision when a product needs them.
- An improvement to the login is a new version of the package, and reaches
  every product through its own pull request.

## In the code

- `packages/admin`: `src/server.js` (the hook, both ways), `src/rules.js`
  (pure, with tests in `test/rules.test.mjs` and `test/basic.test.mjs`),
  `src/password.js` (scrypt), `bin/admin.js` (the `hash` command).
- `hooks.server.ts` in every product, with `admin.handle`.
