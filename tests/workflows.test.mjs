import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './files.mjs';

// Every action from outside this repo is pinned to a full commit SHA, with its
// version as a comment, so a tag that is moved or taken over upstream never
// runs here. Dependabot keeps the SHA and the comment up to date.
const DIR = path.join(ROOT, '.github', 'workflows');
const PINNED = /^[\w.-]+\/[\w./-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/;

const uses = readdirSync(DIR)
	.filter((f) => /\.ya?ml$/.test(f))
	.flatMap((f) =>
		readFileSync(path.join(DIR, f), 'utf8')
			.split('\n')
			.map((line) => /^\s*-?\s*uses:\s*(.+?)\s*$/.exec(line))
			.filter(Boolean)
			.map((m) => ({ file: f, ref: m[1] }))
	);

test('the workflows use actions', () => {
	assert.ok(uses.length > 0);
});

test('every action is pinned to a commit SHA with its version', () => {
	const loose = uses
		.filter((u) => !u.ref.startsWith('./'))
		.filter((u) => !PINNED.test(u.ref))
		.map((u) => `${u.file}: ${u.ref}`);
	assert.deepEqual(loose, []);
});
