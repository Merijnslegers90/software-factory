import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { ROOT, frontmatter } from './files.mjs';

const readJson = (file) => JSON.parse(readFileSync(path.join(ROOT, file), 'utf8'));
const marketplace = readJson('.claude-plugin/marketplace.json');

test('every plugin in the marketplace exists and has the same name in its plugin.json', () => {
	assert.ok(marketplace.plugins.length > 0);
	for (const plugin of marketplace.plugins) {
		const manifest = path.join(plugin.source, '.claude-plugin/plugin.json');
		assert.ok(existsSync(path.join(ROOT, manifest)), `${manifest} is missing`);
		assert.equal(readJson(manifest).name, plugin.name);
	}
});

for (const plugin of marketplace.plugins) {
	const dir = path.join(ROOT, plugin.source);

	test(`${plugin.name}: every skill has a SKILL.md with its own name and a description`, () => {
		const skills = readdirSync(path.join(dir, 'skills'));
		assert.ok(skills.length > 0);
		for (const skill of skills) {
			const fields = frontmatter(readFileSync(path.join(dir, 'skills', skill, 'SKILL.md'), 'utf8'));
			assert.ok(fields, `${skill}/SKILL.md has no frontmatter`);
			assert.equal(fields.name, skill);
			assert.ok(fields.description?.length > 40, `${skill} has too short a description`);
			assert.ok(fields.description.length <= 1024, `${skill} has too long a description`);
		}
	});

	test(`${plugin.name}: every agent has a name equal to its file and a description`, () => {
		for (const file of readdirSync(path.join(dir, 'agents'))) {
			const fields = frontmatter(readFileSync(path.join(dir, 'agents', file), 'utf8'));
			assert.ok(fields, `${file} has no frontmatter`);
			assert.equal(fields.name, file.replace(/\.md$/, ''));
			assert.ok(fields.description?.length > 40, `${file} has too short a description`);
		}
	});
}

// An installed plugin cannot read outside its own folder. The decisions
// therefore come along through a symlink, which must point to adr/.
test('the skill factory-decisions has the decisions through a symlink to adr/', () => {
	const link = path.join(ROOT, 'plugins/software-factory/skills/factory-decisions/adr');
	assert.equal(realpathSync(link), realpathSync(path.join(ROOT, 'adr')));
});
