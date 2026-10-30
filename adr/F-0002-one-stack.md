# F-0002: One stack for every product

- **Status:** accepted
- **Date:** September 2026

## Context

The second product was built on the same stack as the first, which made
reuse easy: the login, the migration script, CI and image resizing came along.
Shared skills, packages and a shared workflow only work when that stack is
fixed. A product on a different stack only half fits.

## Decision

- **Application:** SvelteKit 2 with Svelte 5 (runes), TypeScript and Tailwind
  CSS 4, with `adapter-vercel`.
- **Data:** Supabase: Postgres, Storage and, where there is a login, Auth.
- **Hosting:** Vercel. A preview per pull request, production on a push to
  `main`.
- **Tooling:** pnpm and Node 22; prettier and eslint; vitest for unit tests,
  Playwright for end-to-end tests.
- **Fixed scripts** in `package.json`: `lint`, `check`, `test`, `build`, and
  `test:e2e` when the project has end-to-end tests. CI calls them by these
  names.

## Consequences

- Shared packages and the workflow may assume this stack.
- A product that needs something else writes a project decision with
  "Deviates from: F-0002" and carries what the factory then does not provide.
- A major upgrade (a new SvelteKit, another Node) goes through the shared
  packages and the workflow first, and then through the projects.

## In the code

- `.github/workflows/quality.yml` calls the fixed scripts.
- `packages/config` (to be built): eslint, prettier, tsconfig and vitest.
