# F-0018: The admin changes content through a pull request

- **Status:** accepted
- **Date:** 17 November 2026

## Context

Content that lives in the repo (F-0017) changes through a pull request, with a
preview and a review. That works, but not from a phone without git. F-0016
lets a site without a database have an admin, and that admin can change
nothing yet.

An admin that commits straight to `main` would skip the preview and the
review, which is the reason merijnslegers.nl wanted to remove its admin (its
ADR 0002). An admin that opens a pull request keeps both.

Vercel Blob and Edge Config were considered for settings that go live without
a deploy. Writing to Edge Config needs a Vercel token for the whole team:
Edge Config belongs to the team, and a token for one project cannot reach it.
That is a larger key than a switch is worth. A pull request is live a minute
after the merge.

## Decision

- **An admin changes content in the repo by opening a pull request**, through
  `@merijnslegers/admin/github`. It writes one commit on a branch
  `admin/<key>`. The same key saved again goes into the same pull request;
  after a merge or close, the key starts again from the base branch.
- **The admin never merges.** The owner merges in GitHub, after the preview
  and the checks, as with any change.
- **The project lists where the admin may write** (`allowedPaths`). A path
  outside it, or one that tries to climb out, is refused before anything goes
  to GitHub. Workflows, code and settings are never on the list.
- **The token:**
  - a fine-grained personal access token for one repository, with Contents
    and Pull requests read and write, expiring after a year at most;
  - only in Vercel's environment variables, read at runtime (F-0005), never
    in the browser;
  - called `ADMIN_GITHUB_TOKEN`, next to `ADMIN_GITHUB_REPO` (`owner/name`).
- **Without the token or the repo, saving is off** and the screen names what
  is missing (F-0005). GitHub's answers become outcome codes; the words are
  the project's, as in F-0016. Never an error page.
- **The commit names who changed it** (`Changed-by:`), when the project
  passes it. In a public repo that is a name, not an address.
- **Branches starting with `admin/` belong to the admin.** A branch with an
  open pull request only moves forward; one without is reset from the base
  branch when its key is saved again. No branch is ever named `admin` itself:
  git cannot have `admin/<key>` next to it, so it would block every proposal.
- **This does not replace the database.** F-0017 still decides which kind a
  product is. Name, price, stock and orders of a product with a shop stay in
  its database, because they change through what customers do, not through a
  review. The module is for content in the repo, in any kind of product.
- Vercel Blob and Edge Config are not used for now. A product that needs them
  gets its own decision.

## Consequences

- The owner can publish from a phone: save in the admin, check the preview,
  merge in GitHub.
- Nothing goes live without a merge, so a change from the admin has the same
  checks and the same history in git as one from a developer.
- A change is live a minute or two after the merge, not at once. A switch that
  must flip at once needs another decision.
- The token can write any file in the repo and open pull requests, even if
  the module only writes inside `allowedPaths`. A leaked token can therefore
  open a pull request with anything in it, but cannot merge past branch
  protection. Products that use this protect `main` (a pull request and the
  checks required).
- Once a year the token expires and the admin says so. Someone creates a new
  one and replaces the variable.
- Images are not covered: uploading one is a decision of its own.

## In the code

- `packages/admin`: `src/github.js` (the calls), `src/github-rules.js`
  (pure, with tests in `test/github.test.mjs` against a GitHub in memory).
- In a product: one module with `createContentRepo`, and form actions under
  the admin path that call `propose`.
