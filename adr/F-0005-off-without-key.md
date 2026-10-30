# F-0005: A feature that needs a key is off without that key

- **Status:** accepted
- **Date:** September 2026

## Context

A product depends on external services: payments, mail, accounting, a
language model. Each has a key. A build that broke on a missing key left only
a line deep in the Vercel log. A feature that costs money before anyone
decided to use it is a bill you only see afterwards. And a CI that needs keys
cannot check a pull request from outside.

## Decision

- Keys and settings of external services are read at runtime
  (`$env/dynamic/private`), not at build time.
- Without the key, the feature is off: not a single call goes to the service,
  and the screen and its menu item disappear. Where someone would look for the
  feature (in the admin), the name of what is missing is shown.
- The build never fails on a missing key.
- `.env.example` lists every variable, with a fake value. With it, `check`,
  `build` and CI run without a single real key.
- A feature that is open to the internet and costs money gets its own key,
  separate from the features behind the login. That way it can be revoked on
  its own, and each key shows what it costs.

## Consequences

- Turning a feature on is setting one variable and redeploying.
- The code has an "off" path for every feature, and that path is tested: a
  menu item behind a switch that is off disappears.
- A new service gets a line in `.env.example` straight away.

## In the code

- `.env.example` in every project; `.github/workflows/quality.yml` copies it
  to `.env`.
- The admin menu has a switch per item, with a test.
