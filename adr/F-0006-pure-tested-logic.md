# F-0006: Pure, tested logic; the outside world in server-only modules

- **Status:** accepted
- **Date:** September 2026

## Context

There is no test database, and most external services cannot be reached from
the development environment. Meanwhile the code changes quickly, often by an
agent, and the tests are the gate a change must pass. Calculations sitting in
the middle of a database call fall outside every test.

## Decision

- Calculations, rules, parsing forms and messages, and producing text and HTML
  live in pure modules: no database, no network, no environment variables.
  With a test next to them (`x.ts` and `x.test.ts`).
- Whatever calls the database or an external service lives in a server-only
  module that does as little as possible itself: fetch, call the pure
  function, write back.
- A rule that must not break (legal, security, money) is pinned down in a
  test. If the rule comes from a decision, the test names its number.
- Whatever has not been tested against the real service says so honestly: in
  the decision or in `CLAUDE.md` ("not tested against the real API").

## Consequences

- Unit tests run without `.env` and without network, so anywhere and fast.
- An integration with a service stays thin, and can therefore later sit behind
  an interface with an adapter per vendor.
- Review checks that new calculations do not end up in a server-only module or
  a component.

## In the code

- The `*.test.ts` files next to the pure modules in every project.
- The agent `factory-review` checks this.
