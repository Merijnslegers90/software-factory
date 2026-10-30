import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Alle tekstbestanden die in de repo staan of erin komen, zonder wat git negeert. */
export function tekstbestanden() {
	const uit = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
		cwd: ROOT,
		encoding: 'utf8'
	});
	return uit
		.split('\n')
		.filter(Boolean)
		.filter((f) => /\.(md|mjs|js|ts|json|ya?ml|sh|txt)$/.test(f))
		.map((f) => ({ naam: f, tekst: readFileSync(path.join(ROOT, f), 'utf8') }));
}

/** De velden uit het YAML-blok bovenaan een skill of agent. Alleen `sleutel: waarde` op één regel. */
export function frontmatter(tekst) {
	const blok = /^---\n([\s\S]*?)\n---\n/.exec(tekst);
	if (!blok) return null;
	return Object.fromEntries(
		blok[1]
			.split('\n')
			.map((regel) => /^(\w[\w-]*):\s*(.*)$/.exec(regel))
			.filter(Boolean)
			.map((m) => [m[1], m[2].trim()])
	);
}
