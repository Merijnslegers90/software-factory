// Renders the Svelte components of the packages on the server, for their
// tests (F-0020). The products compile the source with SvelteKit; here the
// compiler of the factory's own dev dependency does it, into .svelte-test/.
// $app/state, $app/forms and $app/navigation are replaced by small stand-ins.

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import { ROOT } from './files.mjs';

const OUT = path.join(ROOT, '.svelte-test');

/** What `page` from $app/state returns in a test; change `url` per test. */
export const page = { url: new URL('http://localhost/admin'), route: { id: '/admin' }, data: {} };

const STUBS = {
	'$app/state': `export const page = globalThis.__msPage;`,
	'$app/forms': `export function enhance() { return { destroy() {} }; }`,
	'$app/navigation': `export function beforeNavigate() {}`
};

globalThis.__msPage = page;

function stubUrl(name) {
	// One folder per process: the test files run in parallel.
	const file = path.join(OUT, `_stubs-${process.pid}`, `${name.replace(/\W/g, '_')}.js`);
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, STUBS[name]);
	return pathToFileURL(file).href;
}

function walk(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		return entry.isDirectory() ? walk(full) : [full];
	});
}

const built = new Set();

/** Compiles every .svelte file under `srcDir` once, and returns where they went. */
function build(srcDir) {
	const outDir = path.join(OUT, path.relative(ROOT, srcDir));
	if (built.has(srcDir)) return outDir;
	rmSync(outDir, { recursive: true, force: true });
	for (const file of walk(srcDir).filter((f) => f.endsWith('.svelte'))) {
		const { js, warnings } = compile(readFileSync(file, 'utf8'), {
			generate: 'server',
			filename: path.relative(ROOT, file)
		});
		if (warnings.length > 0) {
			throw new Error(`${file}: ${warnings.map((w) => `${w.code} ${w.message}`).join('; ')}`);
		}
		const code = js.code.replace(/from\s+['"]([^'"]+)['"]/g, (match, spec) => {
			if (spec in STUBS) return `from '${stubUrl(spec)}'`;
			if (spec.endsWith('.svelte')) return `from '${spec}.js'`;
			if (spec.startsWith('.')) return `from '${pathToFileURL(path.resolve(path.dirname(file), spec)).href}'`;
			return match;
		});
		const target = path.join(outDir, `${path.relative(srcDir, file)}.js`);
		mkdirSync(path.dirname(target), { recursive: true });
		writeFileSync(target, code);
	}
	built.add(srcDir);
	return outDir;
}

/**
 * Renders a component with its props and returns the HTML of the body.
 * `file` is the path of the .svelte file from the repo root.
 */
export async function renderComponent(file, props = {}) {
	const full = path.join(ROOT, file);
	const srcDir = path.dirname(full.replace(/\/ui\/.*$/, '/ui/x'));
	const outDir = build(srcDir);
	const target = path.join(outDir, `${path.relative(srcDir, full)}.js`);
	const { default: Component } = await import(pathToFileURL(target).href);
	return render(Component, { props }).body;
}

/** Like renderComponent, but gives the head as well: `{ head, body }`. */
export async function renderPage(file, props = {}) {
	const full = path.join(ROOT, file);
	const srcDir = path.dirname(full.replace(/\/ui\/.*$/, '/ui/x'));
	const outDir = build(srcDir);
	const target = path.join(outDir, `${path.relative(srcDir, full)}.js`);
	const { default: Component } = await import(pathToFileURL(target).href);
	const { head, body } = render(Component, { props });
	return { head, body };
}

/** Only the visible text of rendered HTML, with spaces collapsed. */
export function textOf(html) {
	return html
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, ' ')
		.trim();
}
