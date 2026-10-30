# F-0009: Every product its own Supabase project

- **Status:** accepted
- **Date:** 30 October 2026

## Context

With a second product that may get a database, reusing the existing Supabase
project is the obvious move. In Supabase one project is one database;
separating products inside it is only possible with a schema per product. They
then share everything attached to the project:

- The `service_role` key applies to the whole project and bypasses RLS
  (F-0004). If one product's key leaks, the other product's data is exposed
  too.
- The migration script records what has been applied in `public._migrations`
  (F-0003). Two products, each with their own folder of migrations, get in
  each other's way there.
- The login (Auth), the storage and the plan's limits are shared. If one
  product exceeds its bandwidth limit, the other goes down with it.

## Decision

- Every product that needs a database gets its own Supabase project, with its
  own keys.
- The connection and the keys live per product in Vercel's environment
  variables. The product's repo only names them, with fake values in
  `.env.example` (F-0005); this repo never names a project.
- Two products in one project, with a schema per product, is only possible
  with a project decision that says "Deviates from: F-0009", for instance when
  a project per product is no longer affordable.

## Consequences

- A new product starts with a new Supabase project, even while it is small.
- The Supabase free plan allows two active projects, across all
  organizations. A third product with a database, or a product that
  structurally exceeds the limits, needs a paid plan. Check the current prices
  then; they are deliberately not in this decision.
- Combining data from two products goes through the code of one of them,
  never through a shared database.

## In the code

- `.env.example` in every project names the variables for the connection and
  the keys.
- `scripts/run-migrations.mjs` (later `packages/migrations`) assumes one
  product per database, with `public._migrations`.
