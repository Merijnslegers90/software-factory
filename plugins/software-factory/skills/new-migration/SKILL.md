---
name: new-migration
description: Write a Supabase database migration the factory way (F-0003, F-0004). Use this for every change to the database, a new table, column, index, check or function, before writing the SQL.
---

# A new migration

A migration runs by itself with the next production deploy (F-0003), so it
must run without manual steps. A table is only reachable by the server,
through `service_role` (F-0004).

## 1. The file

- In `supabase/migrations/`, named `YYYYMMDDHHMMSS_short_description.sql`: the
  current time in UTC, and later than the last one already there. Check with
  `ls supabase/migrations | tail`. Files are applied in name order, so an
  earlier timestamp never runs in production.
- The description in lowercase with underscores, in the project's language.
- Never edit a migration that is already on `main`; it has been applied. A
  mistake is fixed with a new migration.

## 2. A new table

```sql
create table if not exists public.example (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default now()
);

grant select, insert, update, delete on table public.example to service_role;
alter table public.example enable row level security;
```

- Both lines below every `create table`, even for a small join table. The
  project's migration test fails without them.
- No grant to `anon` or `authenticated`, and no policies. RLS without a policy
  is deliberately the second lock.
- Always with the schema name: `public.example`.

## 3. A function or trigger

```sql
create or replace function public.example_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.updated_at := now();
	return new;
end;
$$;
```

`set search_path = ''` in the definition, and every table and type inside it
with its schema name.

## 4. What comes along

- A `check` on a fixed list of values (a status, a kind) must change along
  when that list changes in the code. Search the code for the constant that
  holds the list.
- A column that becomes required on a table with rows gets a default or an
  `update` first, otherwise the deploy fails.
- Rows that must exist (a setting, a starting value) go into the migration
  itself, with `on conflict do nothing`, so it is also correct on an empty
  database.
- Data about real customers or companies does not belong in a migration.

## 5. Checking

- `pnpm run test`: the migration test looks at grant and RLS.
- If the code needs the new migration, say in the pull request that it runs
  with the deploy, and that a preview does not have it yet.
- If the change is hard to reverse (dropping a column, merging tables), write
  a project decision with it (skill `write-adr`).
