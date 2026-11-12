# F-0015: Visitor numbers in the admin, from Vercel Web Analytics

- **Status:** proposed
- **Date:** 12 November 2026

## Context

Every product runs on Vercel (F-0010) and measures its visits with Vercel Web
Analytics: anonymous, without cookies, and so without a cookie banner. The
numbers were only in Vercel's dashboard. There only the developer could see
them, apart from the rest of the business, so the people who run the product
did not know how many people visit, which pages they read and where they come
from.

The owner asked for these numbers in the admin of every product. The first
product to get them is VanVeldeke Bier (its spec 0005).

Vercel has a REST API for the same numbers
(`/v1/query/web-analytics/visits/aggregate` and `/count`). It needs an access
token. A Vercel token cannot be limited to reading: a token for a team can
also deploy, change environment variables and delete projects in every
project of that team.

## Decision

- **Every product shows its visitor numbers in its admin**, read from Vercel
  Web Analytics through `@merijnslegers/analytics`. Vercel stays the only
  source; the numbers are not copied into the database.
- **The package fetches and calculates; the project shows.** The package
  holds the periods, the comparison with the period before, the series per
  day or week and the top lists, and the call to Vercel. The screen, its
  words and its colours belong to the project, as with the admin login
  (F-0011).
- **The admin is left out of every number**, by `beforeSend` in the root
  layout and again with `excludePaths` when the numbers are read. Visits
  measured before `beforeSend` was in place stay in Vercel for as long as the
  plan keeps them; in the first product they were half of all pageviews.
- **Days are Vercel's days, in UTC**, so the totals, the graph and Vercel's
  dashboard agree.
- **The token:**
  - is created for the team, never for the whole account, and expires after
    a year;
  - lives only in Vercel's environment variables, read at runtime (F-0005),
    and never reaches the browser;
  - is called `VERCEL_ANALYTICS_TOKEN`, next to `VERCEL_ANALYTICS_PROJECT_ID`
    and `VERCEL_ANALYTICS_TEAM_ID`. Their own prefix keeps them apart from
    the variables Vercel sets itself.
- **Without the token the screen says it is off**, and nothing is sent to
  Vercel (F-0005). A refused token, a slow or unreachable Vercel or an odd
  answer gives a reason, never an error page; the rest of the admin works.
- **An answer is kept for an hour** per server instance, so opening the
  screen does not call Vercel each time.

## Consequences

- The token is the largest key a product holds: whoever has it can deploy or
  delete any project in the team. That is accepted because it never leaves
  the server, expires after a year and can be revoked in Vercel at once. A
  product whose risk is higher gets its own Vercel team, which costs a seat
  on the Pro plan; that is a project decision.
- Once a year the token expires and the screen says so. Someone creates a
  new one in Vercel and replaces the variable.
- The numbers are as old as an hour at most, and as far back as the Vercel
  plan keeps them.
- Pages under the admin path are not measured (`beforeSend` in the root
  layout, see the skill `setup-product`), so the people who run the product
  do not count themselves.
- An improvement to the numbers is a new version of the package, and
  reaches every product through its own pull request.

## In the code

- `packages/analytics`: `src/rules.js` (pure, with tests in
  `test/rules.test.mjs`) and `src/server.js` (the call to Vercel and the
  hour's cache, with tests in `test/server.test.mjs`).
- In every product: the three variables in `src/env.ts` and `.env.example`,
  and a screen in the admin that calls `createAnalytics`.
