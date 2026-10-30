import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './bestanden.mjs';

// De fabrieksbesluiten in adr/ (F-0001). Zie adr/README.md voor de opbouw.
const ADR_MAP = path.join(ROOT, 'adr');
const SKILL = path.join(ROOT, 'plugins/software-factory/skills/fabrieksbesluiten/SKILL.md');
const BESTANDSNAAM = /^F-(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const KOPJES = ['## Context', '## Besluit', '## Gevolgen', '## In de code'];
const STATUS = /^- \*\*Status:\*\* (voorgesteld|aangenomen|vervallen|vervangen door F-(\d{4}))$/m;

const adrs = readdirSync(ADR_MAP)
	.filter((naam) => naam !== 'README.md')
	.sort()
	.map((naam) => ({
		naam,
		nummer: BESTANDSNAAM.exec(naam)?.[1],
		tekst: readFileSync(path.join(ADR_MAP, naam), 'utf8')
	}));
const readme = readFileSync(path.join(ADR_MAP, 'README.md'), 'utf8');
const skill = readFileSync(SKILL, 'utf8');

test('alleen bestanden in de vorm F-NNNN-titel.md, doorlopend genummerd vanaf F-0001', () => {
	assert.ok(adrs.length > 0);
	adrs.forEach((adr, i) => {
		assert.equal(adr.nummer, String(i + 1).padStart(4, '0'), adr.naam);
	});
});

test('elk besluit begint met zijn eigen nummer als titel', () => {
	for (const adr of adrs) {
		assert.match(adr.tekst.split('\n')[0], new RegExp(`^# F-${adr.nummer}: \\S`), adr.naam);
	}
});

test('elk besluit heeft een status, een datum en de vier vaste kopjes', () => {
	for (const adr of adrs) {
		assert.match(adr.tekst, STATUS, adr.naam);
		assert.match(adr.tekst, /^- \*\*Datum:\*\* \S/m, adr.naam);
		for (const kopje of KOPJES) {
			assert.ok(adr.tekst.includes(`\n${kopje}\n`), `${adr.naam} mist "${kopje}"`);
		}
	}
});

test('een vervangen besluit wijst naar een bestaand besluit dat zegt dat het hem vervangt', () => {
	for (const adr of adrs) {
		const opvolger = STATUS.exec(adr.tekst)?.[2];
		if (!opvolger) continue;
		const nieuw = adrs.find((a) => a.nummer === opvolger);
		assert.ok(nieuw, `${adr.naam} wijst naar F-${opvolger}`);
		assert.ok(nieuw.tekst.includes(`- **Vervangt:** F-${adr.nummer}`), nieuw.naam);
	}
});

test('elk besluit staat in de lijst in adr/README.md', () => {
	for (const adr of adrs) {
		assert.ok(readme.includes(`](${adr.naam})`), `${adr.naam} staat niet in de README`);
	}
});

test('elk geldend besluit staat in de skill fabrieksbesluiten, en de skill noemt niets anders', () => {
	const geldend = adrs.filter((a) => !/vervangen door|vervallen/.test(STATUS.exec(a.tekst)[1]));
	for (const adr of geldend) {
		assert.ok(skill.includes(`adr/${adr.naam}`), `${adr.naam} staat niet in de skill`);
	}
	const genoemd = [...skill.matchAll(/adr\/(F-\d{4}-[\w-]+\.md)/g)].map((m) => m[1]);
	for (const naam of genoemd) {
		assert.ok(
			geldend.some((a) => a.naam === naam),
			`de skill noemt ${naam}, en dat is geen geldend besluit`
		);
	}
});
