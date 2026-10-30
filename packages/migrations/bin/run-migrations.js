#!/usr/bin/env node
// Applies the migrations that have not run yet, on every production deploy
// (F-0003). Call it from "vercel-build", before the build:
//
//   "vercel-build": "run-migrations && vite build"
//
// Outside production (locally, previews) it does nothing, unless
// RUN_MIGRATIONS=1 is set. Without a connection on a production deploy the
// build fails, unless the project passes --allow-without-database because it
// can deliberately go live without one (a project decision that deviates
// from F-0003).
//
// Use the Supabase Session pooler connection string: the direct connection
// is IPv6 only, and Vercel builds without IPv6 (ENETUNREACH).
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { CONNECTION_VARIABLES, describeConnection, parseOptions } from '../src/options.js';

async function main() {
	const options = parseOptions(process.argv.slice(2), process.env);

	if (!options.shouldRun) {
		console.log('[migrations] Skipped: not a production deploy and RUN_MIGRATIONS is not set.');
		return;
	}

	if (!options.connection) {
		const names = CONNECTION_VARIABLES.join(', ');
		if (options.allowWithoutDatabase) {
			console.log(`[migrations] Skipped: no database configured (${names}).`);
			return;
		}
		throw new Error(`[migrations] No database connection found. Set one of: ${names}.`);
	}

	const { name, value } = options.connection;
	console.log(`[migrations] Connecting through ${name} (${describeConnection(value)})...`);

	const dir = path.resolve(options.dir);
	const client = new pg.Client({ connectionString: value, ssl: { rejectUnauthorized: false } });
	await client.connect();

	try {
		await client.query(`
			create table if not exists public._migrations (
				name text primary key,
				applied_at timestamptz not null default now()
			)
		`);

		const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
		const { rows } = await client.query('select name from public._migrations');
		const applied = new Set(rows.map((r) => r.name));
		const pending = files.filter((f) => !applied.has(f));

		if (pending.length === 0) {
			console.log('[migrations] Nothing to do, everything has been applied.');
			return;
		}
		console.log(`[migrations] ${pending.length} pending: ${pending.join(', ')}`);

		// One transaction per file: a failing migration leaves nothing half done,
		// fails the build, and the previous version keeps running.
		for (const file of pending) {
			const sql = await readFile(path.join(dir, file), 'utf8');
			console.log(`[migrations] Applying ${file}`);
			await client.query('begin');
			try {
				await client.query(sql);
				await client.query('insert into public._migrations (name) values ($1)', [file]);
				await client.query('commit');
			} catch (err) {
				await client.query('rollback');
				throw new Error(`[migrations] Failed at ${file}: ${err.message}`, { cause: err });
			}
		}
		console.log(`[migrations] Done, ${pending.length} applied.`);
	} finally {
		await client.end();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
