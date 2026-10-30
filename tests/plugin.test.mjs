import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { ROOT, frontmatter } from './bestanden.mjs';

const leesJson = (bestand) => JSON.parse(readFileSync(path.join(ROOT, bestand), 'utf8'));
const marketplace = leesJson('.claude-plugin/marketplace.json');

test('elke plugin in de marketplace bestaat en heeft dezelfde naam in zijn plugin.json', () => {
	assert.ok(marketplace.plugins.length > 0);
	for (const plugin of marketplace.plugins) {
		const manifest = path.join(plugin.source, '.claude-plugin/plugin.json');
		assert.ok(existsSync(path.join(ROOT, manifest)), `${manifest} ontbreekt`);
		assert.equal(leesJson(manifest).name, plugin.name);
	}
});

for (const plugin of marketplace.plugins) {
	const map = path.join(ROOT, plugin.source);

	test(`${plugin.name}: elke skill heeft een SKILL.md met zijn eigen naam en een beschrijving`, () => {
		const skills = readdirSync(path.join(map, 'skills'));
		assert.ok(skills.length > 0);
		for (const skill of skills) {
			const velden = frontmatter(readFileSync(path.join(map, 'skills', skill, 'SKILL.md'), 'utf8'));
			assert.ok(velden, `${skill}/SKILL.md heeft geen frontmatter`);
			assert.equal(velden.name, skill);
			assert.ok(velden.description?.length > 40, `${skill} heeft een te korte beschrijving`);
			assert.ok(velden.description.length <= 1024, `${skill} heeft een te lange beschrijving`);
		}
	});

	test(`${plugin.name}: elke agent heeft een naam gelijk aan zijn bestand en een beschrijving`, () => {
		for (const bestand of readdirSync(path.join(map, 'agents'))) {
			const velden = frontmatter(readFileSync(path.join(map, 'agents', bestand), 'utf8'));
			assert.ok(velden, `${bestand} heeft geen frontmatter`);
			assert.equal(velden.name, bestand.replace(/\.md$/, ''));
			assert.ok(velden.description?.length > 40, `${bestand} heeft een te korte beschrijving`);
		}
	});
}

// Een geïnstalleerde plugin kan niet buiten zijn eigen map lezen. De besluiten
// komen daarom via een symlink mee, en die moet naar adr/ wijzen.
test('de skill fabrieksbesluiten heeft de besluiten via een symlink naar adr/', () => {
	const link = path.join(ROOT, 'plugins/software-factory/skills/fabrieksbesluiten/adr');
	assert.equal(realpathSync(link), realpathSync(path.join(ROOT, 'adr')));
});
