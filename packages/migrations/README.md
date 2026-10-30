# @merijnslegers/migrations

Runs Supabase migrations on every production deploy, and checks that every
new table gets a grant to `service_role` and row level security. Part of the
[software factory](https://github.com/Merijnslegers90/software-factory): see
decisions F-0003 and F-0004 there, and
[packages/README.md](https://github.com/Merijnslegers90/software-factory/blob/main/packages/README.md)
for how to use it.

```json
"vercel-build": "run-migrations && vite build"
```

```ts
import { checkMigrations } from '@merijnslegers/migrations/checks';
```
