# F-0011: One admin login, through Supabase Auth with an allow list

- **Status:** accepted
- **Date:** 2 November 2026

## Context

Every product has an `/admin` for the people who run it. The first product
began with HTTP basic auth and one shared password, and on 14 October 2026
replaced it with an account per person, because of three problems:

- With one shared password, locking out one person meant changing it for
  everyone.
- The site did not know who was signed in.
- There was no way to log out.

The second product still had the shared password. The rules around the login
(who may enter, the return path after logging in, the Origin check, the headers)
were copied by hand between the two, and drifted apart.

The products already run on Supabase (F-0010), which has its own login. A
login is a security boundary: a mistake in one product is a mistake in all of
them if the code is shared, and an improvement reaches all of them the same way.

## Decision

- Every product logs in to its admin through `@merijnslegers/admin`: Supabase
  Auth, with an email address and a password per person.
- **Who may enter is the allow list in `ADMIN_EMAILS`**, not who exists in
  Supabase.
  - It is checked on every request, so removing an address locks that person
    out, even with a running session.
  - An address that is not on the list gets the same answer as a wrong
    password.
  - The site creates users itself, on their first password link.
- **Only the server talks to Supabase Auth**, with the anon key. The database
  stays with `service_role` (F-0004). The cookie belongs to the admin path
  only, and is `httpOnly` and `SameSite=Lax`.
- **A request under the admin path that can change something must come from
  the site's own origin**, even when SvelteKit's own check is off for a
  webhook. A webhook therefore never lives under the admin path.
- **The path is decoded before it is compared**, the way SvelteKit decodes it
  to pick a route, so `/%61dmin` is the admin path too. A remote function,
  which runs outside the admin path, checks the session itself.
- **Every admin response gets the same headers:** no framing, `noindex`,
  `no-store`, and a referrer that stays on the site.
- **A password link is used only when the password is saved**, never when the
  link is opened, because mail programs and virus scanners open links in
  advance.
- **Without one of its settings, nobody gets in and the login screen names what
  is missing** (F-0005). A product without a database has its admin closed
  until it gets its own Supabase project (F-0009).
- **The screens and their words belong to the project.** The package returns an
  outcome code, and the project writes the sentence for it.

## Consequences

- Who may enter is changed in Vercel's environment variables, and holds from
  the next deploy.
- Every product needs a few settings in its Supabase project: the Redirect URLs,
  preferably its own mail server through Resend, and the "Reset password"
  template. They are in the package's README.
- Everyone on the list may do everything in the admin. Roles are a new
  decision when a product needs them.
- An improvement to the login is a new version of the package, and reaches
  every product through its own pull request.

## In the code

- `packages/admin`: `src/server.js` (the hook and the Supabase calls),
  `src/rules.js` (pure, with tests in `test/rules.test.mjs`).
- `hooks.server.ts` in every product, with `admin.handle`.
