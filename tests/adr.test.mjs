import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './files.mjs';

// The factory decisions in adr/ (F-0001). See adr/README.md for the structure.
const ADR_DIR = path.join(ROOT, 'adr');
const SKILL = path.join(ROOT, 'plugins/software-factory/skills/factory-decisions/SKILL.md');
const FILE_NAME = /^F-(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const HEADINGS = ['## Context', '## Decision', '## Consequences', '## In the code'];
const STATUS = /^- \*\*Status:\*\* (proposed|accepted|deprecated|superseded by F-(\d{4}))$/m;

const adrs = readdirSync(ADR_DIR)
	.filter((name) => name !== 'README.md')
	.sort()
	.map((name) => ({
		name,
		number: FILE_NAME.exec(name)?.[1],
		text: readFileSync(path.join(ADR_DIR, name), 'utf8')
	}));
const readme = readFileSync(path.join(ADR_DIR, 'README.md'), 'utf8');
const skill = readFileSync(SKILL, 'utf8');

test('only files named F-NNNN-title.md, numbered consecutively from F-0001', () => {
	assert.ok(adrs.length > 0);
	adrs.forEach((adr, i) => {
		assert.equal(adr.number, String(i + 1).padStart(4, '0'), adr.name);
	});
});

test('every decision starts with its own number as title', () => {
	for (const adr of adrs) {
		assert.match(adr.text.split('\n')[0], new RegExp(`^# F-${adr.number}: \\S`), adr.name);
	}
});

test('every decision has a status, a date and the four fixed headings', () => {
	for (const adr of adrs) {
		assert.match(adr.text, STATUS, adr.name);
		assert.match(adr.text, /^- \*\*Date:\*\* \S/m, adr.name);
		for (const heading of HEADINGS) {
			assert.ok(adr.text.includes(`\n${heading}\n`), `${adr.name} is missing "${heading}"`);
		}
	}
});

test('a superseded decision points to an existing one that says it supersedes it', () => {
	for (const adr of adrs) {
		const successor = STATUS.exec(adr.text)?.[2];
		if (!successor) continue;
		const next = adrs.find((a) => a.number === successor);
		assert.ok(next, `${adr.name} points to F-${successor}`);
		assert.ok(next.text.includes(`- **Supersedes:** F-${adr.number}`), next.name);
	}
});

test('every decision is in the list in adr/README.md', () => {
	for (const adr of adrs) {
		assert.ok(readme.includes(`](${adr.name})`), `${adr.name} is not in the README`);
	}
});

test('every current decision is in the skill factory-decisions, and the skill names nothing else', () => {
	const current = adrs.filter((a) => !/superseded by|deprecated/.test(STATUS.exec(a.text)[1]));
	for (const adr of current) {
		assert.ok(skill.includes(`adr/${adr.name}`), `${adr.name} is not in the skill`);
	}
	const named = [...skill.matchAll(/adr\/(F-\d{4}-[\w-]+\.md)/g)].map((m) => m[1]);
	for (const name of named) {
		assert.ok(
			current.some((a) => a.name === name),
			`the skill names ${name}, which is not a current decision`
		);
	}
});
