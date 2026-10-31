import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
	checkMigrations,
	createdTables,
	enablesRls,
	grantsServiceRole
} from '../src/checks.js';

test('createdTables finds a table with and without schema', () => {
	assert.deepEqual(createdTables('create table if not exists public.a (id int);'), ['a']);
	assert.deepEqual(createdTables('CREATE TABLE B (id int);'), ['b']);
});

test('grantsServiceRole recognises a grant to service_role, not to another role', () => {
	const sql = 'grant select, insert on table public.a to service_role;';
	assert.equal(grantsServiceRole(sql, 'a'), true);
	assert.equal(grantsServiceRole(sql, 'ab'), false);
	assert.equal(grantsServiceRole('grant select on public.a to anon;', 'a'), false);
});

test('enablesRls recognises RLS on exactly this table', () => {
	const sql = 'alter table public.a enable row level security;';
	assert.equal(enablesRls(sql, 'a'), true);
	assert.equal(enablesRls(sql, 'ab'), false);
	assert.equal(enablesRls('alter table public.a disable row level security;', 'a'), false);
});

function folder(files) {
	const dir = mkdtempSync(path.join(tmpdir(), 'migrations-'));
	for (const [name, sql] of Object.entries(files)) writeFileSync(path.join(dir, name), sql);
	return dir;
}

const GOOD = `create table public.a (id int);
grant select, insert, update, delete on table public.a to service_role;
alter table public.a enable row level security;`;

test('checkMigrations is empty when every table has its grant and RLS', () => {
	assert.deepEqual(checkMigrations(folder({ '1_a.sql': GOOD })), []);
});

test('checkMigrations names the file, the table and what is missing', () => {
	const dir = folder({ '1_b.sql': 'create table public.b (id int);', 'notes.txt': 'create table c' });
	assert.deepEqual(checkMigrations(dir), [
		{ file: '1_b.sql', table: 'b', missing: 'grant' },
		{ file: '1_b.sql', table: 'b', missing: 'rls' }
	]);
});

test('checkMigrations only checks files after grantsAfter and rlsAfter', () => {
	const dir = folder({
		'1_old.sql': 'create table public.old (id int);',
		'2_fix.sql': 'alter table public.old enable row level security;',
		'3_new.sql': 'create table public.new (id int);'
	});
	assert.deepEqual(checkMigrations(dir, { grantsAfter: '1_old.sql', rlsAfter: '2_fix.sql' }), [
		{ file: '3_new.sql', table: 'new', missing: 'grant' },
		{ file: '3_new.sql', table: 'new', missing: 'rls' }
	]);
});
