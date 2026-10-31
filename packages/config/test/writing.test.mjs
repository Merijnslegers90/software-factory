import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { EM_DASH, emDashLines, findEmDashes } from '../src/writing.js';

const D = EM_DASH;

test('EM_DASH is U+2014', () => {
	assert.equal(EM_DASH.codePointAt(0), 0x2014);
});

test('emDashLines finds a dash in the middle of a sentence', () => {
	assert.deepEqual(emDashLines('a.ts', `// Come by ${D} we pour everything`), [
		`a.ts:1: // Come by ${D} we pour everything`
	]);
	assert.deepEqual(emDashLines('a.ts', 'a well-known hyphen and an en dash 1–2'), []);
});

test('emDashLines leaves allowed dashes, but not a forbidden one on the same line', () => {
	const allow = [new RegExp(`<title>.*${D}.*</title>`)];
	assert.deepEqual(emDashLines('a.svelte', `<title>The Source ${D} Brand</title>`, allow), []);
	assert.equal(
		emDashLines('a.svelte', `<title>A ${D} B</title> <p>Welcome ${D} come in</p>`, allow).length,
		1
	);
});

test('findEmDashes walks folders and files, and skips names and paths', () => {
	const root = mkdtempSync(path.join(tmpdir(), 'writing-'));
	mkdirSync(path.join(root, 'src/data'), { recursive: true });
	mkdirSync(path.join(root, 'docs'), { recursive: true });
	mkdirSync(path.join(root, 'src/node_modules'), { recursive: true });
	writeFileSync(path.join(root, 'src/a.ts'), `ok\n// x ${D} y\n`);
	writeFileSync(path.join(root, 'src/data/copy.json'), `"x ${D} y"`);
	writeFileSync(path.join(root, 'src/node_modules/b.js'), `x ${D} y`);
	writeFileSync(path.join(root, 'src/c.png'), `x ${D} y`);
	writeFileSync(path.join(root, 'docs/brief.md'), `x ${D} y`);
	writeFileSync(path.join(root, 'README.md'), `x ${D} y`);

	const found = findEmDashes({
		root,
		dirs: ['src', 'docs'],
		files: ['README.md', 'missing.md'],
		skip: ['copy.json', 'docs/brief.md']
	});
	assert.deepEqual(found.sort(), [`README.md:1: x ${D} y`, `src/a.ts:2: // x ${D} y`]);
});
