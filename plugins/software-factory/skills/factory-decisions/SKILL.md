---
name: factory-decisions
description: The decisions that hold for every product built by the factory (stack, database, migrations, keys, tests, CI, images, one project per product). Use this before making a choice about architecture, the database, an external service, environment variables, tests or CI, and in every review.
---

# Factory decisions

These are the decisions that hold for every product. The project also has its
own decisions in `docs/adr/` and rules in `CLAUDE.md`. A project may deviate,
but only with a project decision that says "Deviates from: F-NNNN" (in a Dutch
project: "Wijkt af van"). Without one, the rule below applies, even if the
code currently does it differently: then the code is behind, not the decision.

Each rule below is the short version. The full decision, with its reasons and
consequences, is in `adr/` next to this file. Read the full decision as soon
as your work touches it.

## The decisions

| No     | Rule                                                                                                                                                                | File                                         |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| F-0001 | A choice that is hard to reverse or touches several places gets an ADR: factory-wide here, otherwise in the project's `docs/adr/`.                                  | `adr/F-0001-decisions-in-two-layers.md`      |
| F-0002 | SvelteKit 2 (Svelte 5), TypeScript, Tailwind 4, Vercel, Supabase, pnpm, Node 22. Fixed scripts: `lint`, `check`, `test`, `build`, `test:e2e`.                      | `adr/F-0002-one-stack.md`                    |
| F-0003 | Migrations in `supabase/migrations/` run with the production deploy (`vercel-build`). Nothing by hand in the editor; an applied migration is never edited again.    | `adr/F-0003-migrations-on-deploy.md`         |
| F-0004 | Only the server talks to the database, with `service_role`. Every new table: grant to `service_role` and RLS on, without policies. Functions with `search_path = ''`. | `adr/F-0004-database-server-only.md`         |
| F-0005 | Keys are read at runtime (`$env/dynamic/private`). Without a key the feature is off, with no calls; the build never fails. Every variable is in `.env.example`.     | `adr/F-0005-off-without-key.md`              |
| F-0006 | Calculations and rules in pure modules with a test next to them; database and services in thin server-only modules. A test that enforces a decision names it.      | `adr/F-0006-pure-tested-logic.md`            |
| F-0007 | Every PR goes through the central workflow `quality.yml` (without secrets) and through the agent `factory-review` before it is merged.                              | `adr/F-0007-one-quality-check.md`            |
| F-0008 | Images are resized in the browser before upload, to a fixed width per kind; only what outsiders load sits in a public bucket.                                      | `adr/F-0008-resize-images-in-browser.md`     |
| F-0009 | Every product its own Supabase project with its own keys. Never two products in one project, unless a project decision deviates.                                   | `adr/F-0009-one-project-per-product.md`      |

## When your work touches a decision

- Follow the decision, and mention its number where it helps: in a comment on
  a test that enforces it, or in the pull request description.
- If a decision does not seem to fit what you need to build, do not quietly
  choose something else. Say so, and propose a project decision with "Deviates
  from" (skill `write-adr`).
- If you make a decision yourself that would hold for every product, propose a
  new factory decision instead of a project decision.
