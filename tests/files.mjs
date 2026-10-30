import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** All text files in the repo or about to be added, minus what git ignores. */
export function textFiles() {
	const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
		cwd: ROOT,
		encoding: 'utf8'
	});
	return out
		.split('\n')
		.filter(Boolean)
		.filter((f) => /\.(md|mjs|js|ts|json|ya?ml|sh|txt)$/.test(f))
		.map((f) => ({ name: f, text: readFileSync(path.join(ROOT, f), 'utf8') }));
}

/** The fields from the YAML block at the top of a skill or agent. Only `key: value` on one line. */
export function frontmatter(text) {
	const block = /^---\n([\s\S]*?)\n---\n/.exec(text);
	if (!block) return null;
	return Object.fromEntries(
		block[1]
			.split('\n')
			.map((line) => /^(\w[\w-]*):\s*(.*)$/.exec(line))
			.filter(Boolean)
			.map((m) => [m[1], m[2].trim()])
	);
}
