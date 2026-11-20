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
  skills/plan/                    questions the owner, then writes the spec, before anything is built
  skills/preview-check/           goes through the Vercel preview and reports what it saw
  skills/factory-decisions/       loads the factory decisions, so every agent knows them
  skills/new-migration/           a Supabase migration with grants and RLS
  skills/write-adr/               record a decision in the right layer
  skills/add-sanity/              moves a site's content from code to Sanity (F-0017)
  skills/setup-product/           starts a new product, or takes an existing site in (F-0014)
  skills/seo/                     makes a product findable: head, sitemap, robots.txt, structured data (F-0019)
  skills/way-of-working/          loads the way of working (the loop, specs, writing, pull requests)
  agents/factory-review.md        checks a change against its spec, the rules and decisions
  hooks/session-start.sh          prepares a fresh cloud session (dependencies, .env, sync)
adr/                              factory decisions (F-0001, F-0002, ...)
docs/way-of-working.md            the loop, the spec format, how we write and describe a change
packages/migrations/              @merijnslegers/migrations: migration runner and grant/RLS check
packages/config/                  @merijnslegers/config: prettier, eslint, tsconfig, em dash check
packages/admin/                   @merijnslegers/admin: admin login, access rules, image resizing
packages/analytics/               @merijnslegers/analytics: visitor numbers from Vercel Web Analytics for the admin
packages/seo/                     @merijnslegers/seo: head, sitemap, robots.txt and structured data on the fixed domain
.github/workflows/quality.yml     reusable CI workflow
.github/workflows/release.yml     publishes a package when its version is new
tests/                            checks on this repo itself
```

Still to build: a hook for lint and format after a change, the package
`mail`, and skills for an admin screen and a mail type.

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

The skills are called `software-factory:plan`,
`software-factory:preview-check`, `software-factory:factory-decisions`,
`software-factory:way-of-working`, `software-factory:new-migration`,
`software-factory:write-adr`, `software-factory:add-sanity`,
`software-factory:setup-product` and `software-factory:seo`, the agent `software-factory:factory-review`.

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

## Using it with other agents

The factory is not tied to one AI vendor. Almost everything here is plain
Markdown:

- The decisions in `adr/` are readable by any agent, and by any human
  reviewer.
- The skills are `SKILL.md` files in the open Agent Skills format. Agents
  that support that format can load them from `plugins/software-factory/skills/`;
  for the rest they read as written instructions.
- The CI workflow is GitHub Actions, so every change passes the same check,
  whoever or whatever wrote it.

Specific to Claude Code are only the packaging and one header: the
marketplace and plugin manifests in the two `.claude-plugin/` folders, and
the frontmatter of `agents/factory-review.md` (its tool list and the skill it
calls by its Claude Code name). Another agent uses the same review
instructions in its own format. The skills name each other by their Claude
Code names too, and `preview-check` uses the tool names of the Vercel
connector and Playwright; another agent follows the same steps with its own
tools.

Each project has an `AGENTS.md` next to its `CLAUDE.md`. Most other coding
agents read that file first. It says what the product is and points to the
factory decisions and the project's own `docs/adr/`.

## Versions

The workflow is called on a major version (`@v1`). A change that can break a
project becomes `v2`; everything else moves along under `v1`. The plugin
follows `main`.

Every change to the workflow also gets a fixed version that never moves, such
as `v1.1.0`: the minor number for a change in what it does, the last number
for a fix. It is a GitHub release, and the repo has release immutability on
(Settings, General, Releases), so its tag cannot be moved or deleted. That
version is the way back. A project that hits a problem after `v1` moved calls
the previous fixed version until it is solved, and the owner can put `v1` back
on it for everyone. A mistake in a release is fixed in a new one, never by
changing the old one.

After the merge, in a clone of `main`:

```bash
gh release create v1.2.0 --target main --generate-notes   # the next free number
git fetch origin --tags
git tag -f v1 v1.2.0
git push -f origin v1
```

Inside the workflows, every action from outside this repo is pinned to a full
commit SHA with its version as a comment, so a tag that is moved or taken over
upstream never runs here. Dependabot (`.github/dependabot.yml`) opens one pull
request a week that updates them, and `tests/workflows.test.mjs` fails on an
action that is not pinned. A project calls `quality.yml@v1` by its tag: it is
this repo, and every change to it goes through the same loop.

## Because the repo is public

This holds the way of building, never data about a company, a customer or a
person involved, no keys and no internal addresses.
`tests/public.test.mjs` looks for keys, email addresses, phone numbers and
Dutch company and VAT numbers.

## Checks

```bash
npm test                          # decisions, plugin, public, workflows
claude plugin validate .          # the marketplace
claude plugin validate plugins/software-factory
```

The workflow `self-check.yml` runs them on every pull request.

## License

MIT, see [LICENSE](LICENSE). The packages carry the same license.
