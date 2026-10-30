# F-0003: Migrations run with the production deploy

- **Status:** accepted
- **Date:** September 2026

## Context

Database changes were pasted into the Supabase SQL editor by hand. That got
forgotten, or happened at a different moment than the deploy of the code that
relied on it.

The script that solved this was copied from the first product to the second
and then drifted. The biggest difference: without a database connection, one
fails and the other skips the migrations.

## Decision

- Migrations live in `supabase/migrations/`, prefixed with a timestamp
  (`20261030120000_short_description.sql`), and are applied in name order.
- `vercel-build` runs the migration script before the build. Only on a
  production deploy (`VERCEL_ENV=production`), or when `RUN_MIGRATIONS=1` is
  set; locally and on a preview it does nothing.
- Each file runs in its own transaction and is recorded in
  `public._migrations`. A migration that fails fails the build, and the
  previous version keeps running.
- The connection comes from `SUPABASE_DB_URL`, or from the names that Vercel's
  integrations create. Use the Supabase Session pooler: the direct connection
  is IPv6 only, and Vercel builds without IPv6.
- If no connection is configured on a production deploy, the build fails. A
  product that can deliberately go live without a database records that in a
  project decision ("Deviates from: F-0003"), and then the script skips.
- Nothing about the database is done by hand anymore.

## Consequences

- Code and database go live in one deploy.
- A migration must run without manual steps and must not depend on anything
  done in the editor.
- An applied migration is never edited again. A mistake is fixed with a new
  migration.
- A preview applies no migrations. Code that relies on a new migration only
  works in a preview once that preview's database already has it.

## In the code

- `scripts/run-migrations.mjs` and `vercel-build` in every project. That
  script becomes the package `packages/migrations`.
- The skill `new-migration` writes a migration following this decision and
  F-0004.
