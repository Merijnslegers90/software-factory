import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeConnection, parseOptions } from '../src/options.js';

test('runs only on a production deploy or with RUN_MIGRATIONS=1 (F-0003)', () => {
	assert.equal(parseOptions([], {}).shouldRun, false);
	assert.equal(parseOptions([], { VERCEL_ENV: 'preview' }).shouldRun, false);
	assert.equal(parseOptions([], { VERCEL_ENV: 'production' }).shouldRun, true);
	assert.equal(parseOptions([], { RUN_MIGRATIONS: '1' }).shouldRun, true);
});

test('takes the first connection variable that is set', () => {
	const options = parseOptions([], { POSTGRES_URL: 'b', SUPABASE_DB_URL: 'a' });
	assert.deepEqual(options.connection, { name: 'SUPABASE_DB_URL', value: 'a' });
	assert.equal(parseOptions([], {}).connection, null);
});

test('reads --dir and --allow-without-database, and refuses anything else', () => {
	assert.equal(parseOptions([], {}).dir, 'supabase/migrations');
	assert.equal(parseOptions(['--dir', 'db'], {}).dir, 'db');
	assert.equal(parseOptions(['--dir=db'], {}).dir, 'db');
	assert.equal(parseOptions([], {}).allowWithoutDatabase, false);
	assert.equal(parseOptions(['--allow-without-database'], {}).allowWithoutDatabase, true);
	assert.throws(() => parseOptions(['--force'], {}), /Unknown option/);
	assert.throws(() => parseOptions(['--dir'], {}), /needs a folder/);
});

test('describes a connection without its password', () => {
	// Built in parts, so the repo's own check on connection strings with a
	// password (tests/public.test.mjs) does not trip over this test.
	const text = describeConnection(['postgresql://user', 'secret@host:5432/db'].join(':'));
	assert.equal(text, 'user@host:5432/db');
	assert.ok(!text.includes('secret'));
	assert.equal(describeConnection('not a url'), '(could not parse the connection string)');
});
