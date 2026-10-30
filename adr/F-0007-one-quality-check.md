# F-0007: Every change goes through the same quality check

- **Status:** accepted
- **Date:** 30 October 2026

## Context

Both products had their own CI workflow, copied from each other and then
drifted: one did not build but ran end-to-end tests, the other did build, and
the pnpm version came from the workflow in one and from `package.json` in the
other. An improvement in one did not reach the other.

## Decision

- Every pull request and every push to `main` runs `lint`, `check`, `test`
  and `build`, and `test:e2e` when the project has end-to-end tests.
- The reusable workflow `quality.yml` in this repo does that. A project only
  has a workflow of a few lines that calls it, pinned to a version (`@v1`).
- The check uses the fake values from `.env.example` and needs no secrets
  (F-0005).
- The workflow only checks. Building and publishing is Vercel's job: a preview
  per pull request, production after the merge.
- A change reaches `main` through a pull request, which is reviewed before the
  merge by the agent `factory-review` and by a human.

## Consequences

- A step added here holds in every project as soon as it uses the new version.
  A change that can break a project becomes a new major version (`@v2`).
- A project can switch a step off with a workflow input, but cannot quietly
  run its own variant.
- The fixed script names from F-0002 are thereby an agreement that CI
  enforces.

## In the code

- `.github/workflows/quality.yml`.
- `plugins/software-factory/agents/factory-review.md`.
