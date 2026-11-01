# F-0010: One stack for every product, on SvelteKit 3

- **Status:** accepted
- **Date:** 1 November 2026
- **Supersedes:** F-0002

## Context

F-0002 fixed one stack for every product, on SvelteKit 2. SvelteKit 3 came
out in autumn 2026. It moves the Svelte settings from `svelte.config.js` into
`vite.config.ts`, replaces the `$lib` alias by the `#lib` import of Node,
declares every environment variable in `src/env.ts`, and needs TypeScript 6
and Node 22.17.

A trial on one product showed that the official migration (`sv migrate
sveltekit-3`) does most of the work. Two things needed a hand: TypeScript 6
no longer loads the types of Node by default, so the shared tsconfig has to
name them next to those of SvelteKit; and eslint cannot read
`vite.config.ts` by itself, so the shared eslint settings load the Svelte
settings with `@sveltejs/load-config`. Both are now in
`@merijnslegers/config` 1.0.

A product that stays on SvelteKit 2 falls further behind with every release,
and the shared packages can only serve one version well.

## Decision

- **Application:** SvelteKit 3 with Svelte 5 (runes), TypeScript 6 and
  Tailwind CSS 4, with `adapter-vercel`. The Svelte settings live in
  `vite.config.ts`; there is no `svelte.config.js`.
- **Environment variables** are declared in `src/env.ts` with
  `defineEnvVars` and read from `$app/env/private` or `$app/env/public`. A
  key is never `static`, and its schema accepts a missing value, so the
  feature is off without it and the app still starts (F-0005).
- **Data:** Supabase: Postgres, Storage and, where there is a login, Auth.
- **Hosting:** Vercel. A preview per pull request, production on a push to
  `main`.
- **Tooling:** pnpm and Node 22 (at least 22.17); prettier and eslint, from
  `@merijnslegers/config` 1.x; vitest for unit tests, Playwright for
  end-to-end tests.
- **Fixed scripts** in `package.json`: `lint`, `check`, `test`, `build`, and
  `test:e2e` when the project has end-to-end tests. CI calls them by these
  names.

## Consequences

- A new product starts on SvelteKit 3.
- A product on SvelteKit 2 moves over with `sv migrate sveltekit-3` and
  `@merijnslegers/config` 1.x in one pull request. Until then it stays on
  `@merijnslegers/config` 0.x and is behind, not deviating: it needs no
  project decision, but the move is on its list.
- Shared packages and the workflow may assume this stack. A package that
  only works on SvelteKit 3 raises its major version.
- A product that needs something else writes a project decision with
  "Deviates from: F-0010" and carries what the factory then does not provide.
- The next major upgrade works the same way: a trial on one product, the
  shared packages and the workflow, a new factory decision, then the
  projects one by one.

## In the code

- `.github/workflows/quality.yml` calls the fixed scripts.
- `packages/config`: eslint, prettier and the tsconfig for SvelteKit 3. Its
  tsconfig names the types of Node and of SvelteKit; a project extends it
  next to `$app/tsconfig`.
