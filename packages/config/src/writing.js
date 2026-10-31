// The em dash check from the way of working (docs/way-of-working.md in
// software-factory). A project runs it in a test with its own exceptions.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// Built from its code point, so this file never contains the character
// itself and does not fail its own check.
export const EM_DASH = String.fromCharCode(0x2014);

export const DEFAULT_EXTENSIONS = /\.(ts|js|mjs|cjs|svelte|css|html|md|yml|yaml|json|sql|sh)$/;

/**
 * Lines of one text with an em dash that is not allowed, as "path:line: text".
 * Each pattern in `allow` is removed from a line before looking, so a line
 * with an allowed dash and a forbidden one is still found.
 */
export function emDashLines(file, text, allow = []) {
	return text.split('\n').flatMap((line, i) => {
		if (!line.includes(EM_DASH)) return [];
		const rest = allow.reduce(
			(r, pattern) => r.replace(new RegExp(pattern.source, pattern.flags.replace('g', '') + 'g'), ''),
			line
		);
		return rest.includes(EM_DASH) ? [`${file}:${i + 1}: ${line.trim()}`] : [];
	});
}

/**
 * Every forbidden em dash under `dirs` and in `files`, relative to `root`.
 * `skip` holds names or relative paths that are left out, such as a copy of
 * database rows or a quoted source document.
 */
export function findEmDashes({
	root,
	dirs = [],
	files = [],
	allow = [],
	skip = [],
	extensions = DEFAULT_EXTENSIONS
}) {
	const skipped = (rel) => skip.includes(rel) || skip.includes(path.basename(rel));

	function walk(dir) {
		let names;
		try {
			names = readdirSync(path.join(root, dir));
		} catch {
			return [];
		}
		return names.flatMap((name) => {
			const rel = path.join(dir, name);
			if (name === 'node_modules' || skipped(rel)) return [];
			if (statSync(path.join(root, rel)).isDirectory()) return walk(rel);
			return extensions.test(name) ? [rel] : [];
		});
	}

	const paths = [...dirs.flatMap(walk), ...files.filter((f) => !skipped(f))];
	return paths.flatMap((rel) => {
		let text;
		try {
			text = readFileSync(path.join(root, rel), 'utf8');
		} catch {
			return [];
		}
		return emDashLines(rel, text, allow);
	});
}
