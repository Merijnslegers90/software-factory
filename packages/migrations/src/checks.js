// Checks that every migration follows F-0004: a table it creates gets a grant
// to service_role and row level security. Pure apart from reading the folder,
// so a project's test can call it without a database.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Tables a migration creates, lower case and without schema. */
export function createdTables(sql) {
	const pattern = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?(\w+)"?/gi;
	return [...sql.matchAll(pattern)].map((m) => m[1].toLowerCase());
}

/** Whether the migration grants service_role privileges on this table. */
export function grantsServiceRole(sql, table) {
	const pattern = new RegExp(
		`grant\\s[^;]*\\bon\\s+(?:table\\s+)?(?:public\\.)?"?${table}"?\\s[^;]*\\bto\\s[^;]*\\bservice_role\\b`,
		'i'
	);
	return pattern.test(sql);
}

/** Whether the migration enables row level security on this table. */
export function enablesRls(sql, table) {
	const pattern = new RegExp(
		`alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?(?:public\\.)?"?${table}"?\\s+enable\\s+row\\s+level\\s+security`,
		'i'
	);
	return pattern.test(sql);
}

/**
 * Every table in the migrations folder that misses its grant or its RLS.
 *
 * Projects that existed before a rule can start it later: only files whose
 * name sorts after `grantsAfter` or `rlsAfter` are checked for that rule. The
 * migration named there is the one that fixed the older tables.
 */
export function checkMigrations(dir, { grantsAfter = '', rlsAfter = '' } = {}) {
	const files = readdirSync(dir)
		.filter((f) => f.endsWith('.sql'))
		.sort();
	const problems = [];
	for (const file of files) {
		const sql = readFileSync(path.join(dir, file), 'utf8');
		for (const table of createdTables(sql)) {
			if (file > grantsAfter && !grantsServiceRole(sql, table)) {
				problems.push({ file, table, missing: 'grant' });
			}
			if (file > rlsAfter && !enablesRls(sql, table)) {
				problems.push({ file, table, missing: 'rls' });
			}
		}
	}
	return problems;
}
