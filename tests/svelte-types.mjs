import { readFileSync } from 'node:fs';

// The admin blocks are Svelte source with hand-written types (F-0020). A prop
// that a component reads but its .d.ts does not name is refused by the
// product's type check, as the theme of AdminShell once was. These helpers
// let a test compare the two.

/** The names a component takes from $props(). */
export function propsOf(file) {
	const source = readFileSync(file, 'utf8');
	const match = source.match(/let\s*\{([\s\S]*?)\}\s*=\s*\$props\(\)/);
	if (!match) return [];
	// Split on commas at the top level only, so a default such as
	// `show = { a: true, b: false }` stays one prop.
	const names = [];
	let level = 0;
	let part = '';
	for (const char of `${match[1]},`) {
		if ('{([<'.includes(char)) level++;
		if ('})]>'.includes(char)) level--;
		if (char === ',' && level === 0) {
			const name = part.trim().split(/[\s=:]/)[0];
			if (name) names.push(name);
			part = '';
		} else part += char;
	}
	return names;
}

/** The prop names the .d.ts gives a component: `export const Name: Component<{ ... }>`. */
export function typedPropsOf(dts, name) {
	const source = readFileSync(dts, 'utf8');
	const start = source.indexOf(`export const ${name}: Component<{`);
	if (start === -1) return null;
	let depth = 0;
	let i = source.indexOf('{', start);
	const from = i;
	for (; i < source.length; i++) {
		if (source[i] === '{') depth++;
		if (source[i] === '}' && --depth === 0) break;
	}
	const body = source.slice(from + 1, i);
	// Only the keys at the top level of the props object, one per line or
	// separated by semicolons; comments are skipped.
	const flat = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
	const keys = [];
	let level = 0;
	let segment = '';
	for (const char of flat) {
		if ('{(<['.includes(char)) level++;
		if ('})>]'.includes(char)) level--;
		if (level === 0 && (char === ';' || char === '\n')) {
			const key = segment.match(/^\s*(\w+)\??:/);
			if (key) keys.push(key[1]);
			segment = '';
		} else segment += char;
	}
	const last = segment.match(/^\s*(\w+)\??:/);
	if (last) keys.push(last[1]);
	return keys;
}
