# F-0004: The database only from the server, with service_role

- **Status:** accepted
- **Date:** September 2026, extended with RLS on 21 October 2026

## Context

Supabase exposes the `public` schema through a Data API, and the anon key that
goes with it is meant to sit in the browser. Taking that route means guarding
every table with policies, and a forgotten policy is a leak.

Since 30 October 2026 Supabase no longer grants privileges on a new table in
`public` by default. Without a grant, supabase-js returns "permission denied",
and you only find out in production. A table without RLS triggers the
`rls_disabled_in_public` warning, a function without a fixed `search_path`
the `function_search_path_mutable` warning.

## Decision

- The site talks to the database only from the server (`+page.server.ts`,
  `+server.ts` and server-only modules), with the `service_role` key. The
  browser never talks to the database itself.
- A migration that creates a table adds below it:
  `grant select, insert, update, delete on table public.<name> to service_role;`
  and `alter table public.<name> enable row level security;`.
- `anon` and `authenticated` get nothing. RLS without policies is the second
  lock: should a grant to `anon` ever appear, the table still yields no rows.
  `service_role` bypasses RLS.
- A function in `public` gets `set search_path = ''` and names every table
  with its schema (`public.orders`).
- Who may do what is decided by code on the server (the hook and the server
  actions), not by a policy in the database.

## Consequences

- The `service_role` key never reaches the browser: only through
  `$env/dynamic/private` or `$env/static/private`.
- A login through Supabase Auth uses the anon key, but only on the server and
  only to log in; the tables stay closed to that role.
- Images that outsiders must load (the site, a mail client) live in a public
  bucket. Everything else stays private.
- A project that still has tables without RLS turns it on with one migration
  across all existing tables.

## In the code

- `src/lib/migraties.test.ts` in every project fails the tests when a new
  table gets no grant or no RLS. That test moves into `packages/migrations`.
- The skill `new-migration`.
