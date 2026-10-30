# Packages

Shared code for every product, published on npm under `@merijnslegers`. A
project installs them like any other dependency instead of keeping its own
copy, and Dependabot or Renovate opens a pull request for each new version.

| Package                     | What it holds                                                          |
| --------------------------- | ---------------------------------------------------------------------- |
| `@merijnslegers/migrations` | The migration runner for `vercel-build` (F-0003) and the grant and RLS check (F-0004) |
| `@merijnslegers/config`     | The shared prettier, eslint and TypeScript settings (F-0002), and the em dash check   |

Plain JavaScript with hand-written type files, so there is no build step.
Tests run with Node's own test runner: `npm test` at the repo root.

## Using them in a project

```bash
pnpm add -D @merijnslegers/migrations @merijnslegers/config
```

**Migrations.** In `package.json`:

```json
"vercel-build": "run-migrations && vite build"
```

A project that may go live without a database (a project decision that
deviates from F-0003) adds `--allow-without-database`. The folder is
`supabase/migrations`; `--dir` changes it.

The check in a test:

```ts
// F-0004
import { checkMigrations } from '@merijnslegers/migrations/checks';

it('gives every new table a grant and RLS', () => {
	expect(checkMigrations('supabase/migrations', { grantsAfter: '...', rlsAfter: '...' })).toEqual([]);
});
```

`grantsAfter` and `rlsAfter` are for projects that existed before the rule:
only migrations after the named file are checked.

**Prettier.** `prettier.config.js`:

```js
import config from '@merijnslegers/config/prettier';

export default { ...config, tailwindStylesheet: './src/app.css' };
```

**Eslint.** `eslint.config.js`:

```js
import path from 'node:path';
import factory from '@merijnslegers/config/eslint';
import svelteConfig from './svelte.config.js';

export default factory({
	gitignorePath: path.resolve(import.meta.dirname, '.gitignore'),
	svelteConfig
});
```

The project keeps its own eslint and prettier plugins installed; the package
lists them as peer dependencies.

**TypeScript.** `tsconfig.json`:

```json
{ "extends": ["./.svelte-kit/tsconfig.json", "@merijnslegers/config/tsconfig.json"] }
```

**The em dash check** (way of working), in a test:

```ts
import { findEmDashes } from '@merijnslegers/config/writing';

it('has no em dashes', () => {
	expect(findEmDashes({ root, dirs: ['src', 'docs'], allow: [], skip: [] })).toEqual([]);
});
```

`allow` holds patterns for dashes the project keeps on purpose, such as a
separator in page titles; `skip` holds names or paths to leave out.

## Releasing

A release is a pull request that raises the version in the package's
`package.json`. After the merge, `.github/workflows/release.yml` publishes
every package whose version is not on npm yet. It uses npm's trusted
publishing, so there is no npm token in GitHub.

A change that can break a project raises the major version.

### The first version of a new package

Trusted publishing can only be set up on a package that exists, so the first
version is published by hand, once:

1. `npm login` with the account that owns the `@merijnslegers` scope.
2. In the package folder: `npm publish --access public`.
3. On npmjs.com, in the package's settings under Trusted Publisher, add
   GitHub Actions with repository `Merijnslegers90/software-factory` and
   workflow `release.yml`.

From then on the workflow publishes every new version.
