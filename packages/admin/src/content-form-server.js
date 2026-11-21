// The server side of the form block (F-0020): read the file from the repo,
// from an open proposal first, and save the entered values as a proposal
// through propose() of F-0018. Server only.

import { branchName } from './github-rules.js';
import {
	checkFields,
	checkValues,
	fileContent,
	fixedListsKept,
	mergeIntoFile,
	valuesFromFile
} from './content-form.js';

/**
 * Where the form starts: the version in the open proposal for `key` when
 * there is one, else the base branch. Without the GitHub settings the form
 * shows `current` (the file as the site was built with it) and cannot save.
 */
// `open` is the list of open proposals when the caller already has it.
async function readSource(repo, { path, key, current }, open) {
	if (!repo.enabled) return { outcome: 'no-key', data: current ?? null, proposal: null };
	open ??= await repo.openProposals();
	if (open.outcome !== 'ok') return { outcome: open.outcome, data: current ?? null, proposal: null };
	const proposal = open.proposals.find((p) => p.branch === branchName(key)) ?? null;
	const file = await repo.readFile(path, proposal ? { ref: proposal.branch } : undefined);
	if (file.outcome === 'not-found') return { outcome: 'ok', data: {}, proposal };
	if (file.outcome !== 'ok') return { outcome: file.outcome, data: current ?? null, proposal };
	try {
		return { outcome: 'ok', data: JSON.parse(file.content), proposal };
	} catch {
		return { outcome: 'mismatch', data: null, proposal };
	}
}

/**
 * The data for AdminContentForm: the values, the open proposal, and whether
 * saving is possible (and if not, why).
 */
export async function loadContentForm(repo, { path, key, fields, current }, open) {
	const source = await readSource(repo, { path, key, current }, open);
	const read = source.data === null ? null : valuesFromFile(fields, source.data);
	const mismatch = source.outcome === 'mismatch' || (read && !read.ok);
	return {
		values: read?.ok ? read.values : null,
		proposal: source.proposal,
		canSave: source.outcome === 'ok' && !mismatch,
		outcome: mismatch ? 'mismatch' : source.outcome,
		mismatchAt: read && !read.ok ? read.at : null,
		missing: repo.enabled ? [] : repo.missingSettings()
	};
}

/**
 * Checks the entered values and opens or extends the proposal. Gives
 * `{ ok: true, changed, proposal }`, `{ ok: false, errors }` for input that is
 * not right, or `{ ok: false, outcome }` when the repo refused or failed.
 */
export async function saveContentForm(repo, { path, key, title, fields, value, changedBy, current }) {
	const checked = checkValues(fields, value);
	if (!checked.ok) return { ok: false, errors: checked.errors };
	const source = await readSource(repo, { path, key, current });
	if (source.outcome !== 'ok') return { ok: false, outcome: source.outcome };
	const read = valuesFromFile(fields, source.data);
	if (!read.ok) return { ok: false, outcome: 'mismatch' };
	if (!fixedListsKept(fields, read.values, checked.values)) {
		return { ok: false, errors: { '': 'fixed-list' } };
	}
	const content = fileContent(mergeIntoFile(source.data, fields, checked.values));
	const result = await repo.propose({ key, title, files: [{ path, content }], changedBy });
	if (result.outcome !== 'ok') return { ok: false, outcome: result.outcome };
	return { ok: true, changed: result.changed, proposal: result.proposal };
}

/**
 * A form action for `+page.server.ts`: reads `value` from the form, saves,
 * and returns a SvelteKit `fail` with the errors or the outcome when it did
 * not work.
 */
export function contentFormAction(repo, { path, key, title, fields, current, changedBy }) {
	return async (event) => {
		const { fail } = await import('@sveltejs/kit');
		const form = await event.request.formData();
		const result = await saveContentForm(repo, {
			path,
			key,
			title,
			fields,
			current,
			value: form.get('value'),
			changedBy: typeof changedBy === 'function' ? changedBy(event) : changedBy
		});
		if (result.ok) return result;
		return fail(result.errors ? 400 : 502, result);
	};
}

/** The data for AdminProposals: the open proposals, or why they cannot be shown. */
export async function loadProposals(repo) {
	if (!repo.enabled) return { outcome: 'no-key', proposals: [], missing: repo.missingSettings() };
	const open = await repo.openProposals();
	if (open.outcome !== 'ok') return { outcome: open.outcome, proposals: [], missing: [] };
	return { outcome: 'ok', proposals: open.proposals, missing: [] };
}

// Keys become branch names (`admin/<key>`) and parts of a URL.
const SECTION_KEY = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * One Content page with a tab per section (#37). The product decides which
 * sections there are; each is a JSON file with its fields, saved on its own
 * as a proposal on `admin/<key>`. Gives `load` and `actions` for a route such
 * as `src/routes/admin/content/[[section]]/+page.server.ts`. A mistake in the
 * list throws at once, when the server starts.
 */
export function defineContent(repo, sections, { base = '/admin/content', param = 'section', changedBy } = {}) {
	if (!Array.isArray(sections) || sections.length === 0) {
		throw new Error('defineContent: give at least one section.');
	}
	const keys = new Set();
	const paths = new Set();
	for (const section of sections) {
		const name = section?.key ?? '(no key)';
		if (typeof section?.key !== 'string' || !SECTION_KEY.test(section.key)) {
			throw new Error(`defineContent: "${name}" is not a valid key (a-z, 0-9 and -).`);
		}
		if (keys.has(section.key)) throw new Error(`defineContent: the key "${section.key}" is there twice.`);
		if (typeof section.path !== 'string' || section.path === '') {
			throw new Error(`defineContent: "${name}" has no path.`);
		}
		if (paths.has(section.path)) throw new Error(`defineContent: the file ${section.path} is there twice.`);
		if (typeof section.label !== 'string' || section.label.trim() === '') {
			throw new Error(`defineContent: "${name}" has no label.`);
		}
		if (typeof section.title !== 'string' || section.title.trim() === '') {
			throw new Error(`defineContent: "${name}" has no title for its pull request.`);
		}
		checkFields(section.fields);
		keys.add(section.key);
		paths.add(section.path);
	}
	const root = base.replace(/\/+$/, '');

	async function find(event) {
		const key = event.params?.[param];
		const section = key ? sections.find((s) => s.key === key) : sections[0];
		if (!section) {
			const { error } = await import('@sveltejs/kit');
			error(404, 'Not found');
		}
		return section;
	}

	return {
		async load(event) {
			const section = await find(event);
			const open = repo.enabled ? await repo.openProposals() : null;
			const proposals = open?.outcome === 'ok' ? open.proposals : [];
			const form = await loadContentForm(repo, section, open ?? undefined);
			return {
				content: {
					sections: sections.map((s) => ({
						key: s.key,
						label: s.label,
						href: `${root}/${s.key}`,
						proposal: proposals.some((p) => p.branch === branchName(s.key))
					})),
					active: section.key,
					fields: section.fields,
					form
				}
			};
		},
		actions: {
			async default(event) {
				const section = await find(event);
				return contentFormAction(repo, { ...section, changedBy })(event);
			}
		}
	};
}
