# software-factory

How I build software: shared skills, agents, architecture decisions, CI and
libraries for every product.

Every product is built the same way: the same stack, the same agreements in
the repo, the same checks, and agents that work from a specification and have
to pass a review. Everything that makes up that way of building lives here.
The products themselves live in their own repos and keep only what belongs to
that product.

## What is here

```
.claude-plugin/marketplace.json   this repo as a plugin marketplace for Claude Code
plugins/software-factory/
  skills/factory-decisions/       loads the factory decisions, so every agent knows them
  skills/new-migration/           a Supabase migration with grants and RLS
  skills/write-adr/               record a decision in the right layer
  agents/factory-review.md        checks a change against the rules and decisions
adr/                              factory decisions (F-0001, F-0002, ...)
.github/workflows/quality.yml     reusable CI workflow
tests/                            checks on this repo itself
```

Still to build: hooks (lint and format after a change), the shared packages
under `packages/` (`migrations`, `config`, `admin`, `mail`), skills for an
admin screen, a mail type, a spec and a new product, and the way of working in
`docs/way-of-working.md`.

## Connecting a project

**Skills and agents.** Add the marketplace to the project's
`.claude/settings.json`. Nothing gets copied; an improved skill applies
everywhere at once.

```json
{
	"extraKnownMarketplaces": {
		"software-factory": {
			"source": { "source": "github", "repo": "Merijnslegers90/software-factory" }
		}
	},
	"enabledPlugins": {
		"software-factory@software-factory": true
	}
}
```

To install it on its own, outside a project:
`/plugin install software-factory --marketplace Merijnslegers90/software-factory`.

The skills are called `software-factory:factory-decisions`,
`software-factory:new-migration` and `software-factory:write-adr`, the agent
`software-factory:factory-review`.

**CI.** Replace the project's own workflow with a call to the central one:

```yaml
name: Quality

on:
  push:
    branches: [main]
  pull_request:

jobs:
  quality:
    uses: Merijnslegers90/software-factory/.github/workflows/quality.yml@v1
    with:
      e2e: true
```

The workflow runs `lint`, `check`, `test` and `build`, and with `e2e: true`
also `test:e2e`, with the fake values from `.env.example`. Other inputs:
`node-version`, `pnpm-version` (empty means `packageManager` from
`package.json`), `env-file`, `build` and `timeout-minutes`.

**Decisions.** A project keeps its own decisions in `docs/adr/` and refers to
the factory with "Follows: F-NNNN" or, deliberately, "Deviates from: F-NNNN".
See [adr/README.md](adr/README.md).

## Versions

The workflow is called on a major version (`@v1`). A change that can break a
project becomes `v2`; everything else moves along under `v1`. The plugin
follows `main`.

## Because the repo is public

This holds the way of building, never data about a company, a customer or a
person involved, no keys and no internal addresses.
`tests/public.test.mjs` looks for keys, email addresses, phone numbers and
Dutch company and VAT numbers.

## Checks

```bash
npm test                          # decisions, plugin, public
claude plugin validate .          # the marketplace
claude plugin validate plugins/software-factory
```

The workflow `self-check.yml` runs them on every pull request.
