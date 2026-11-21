// The server side of the form block (F-0020): read the file from the repo,
// from an open proposal first, and save the entered values as a proposal
// through propose() of F-0018. Server only.

import { branchName } from './github-rules.js';
import { checkValues, fileContent, fixedListsKept, mergeIntoFile, valuesFromFile } from './content-form.js';

/**
 * Where the form starts: the version in the open proposal for `key` when
 * there is one, else the base branch. Without the GitHub settings the form
 * shows `current` (the file as the site was built with it) and cannot save.
 */
async function readSource(repo, { path, key, current }) {
	if (!repo.enabled) return { outcome: 'no-key', data: current ?? null, proposal: null };
	const open = await repo.openProposals();
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
export async function loadContentForm(repo, { path, key, fields, current }) {
	const source = await readSource(repo, { path, key, current });
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
