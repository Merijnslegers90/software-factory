// The rules around changing content through a pull request (F-0018). Pure, so
// they are tested without GitHub (F-0006). The calls are in github.js.

/** The largest file the admin writes. It is for text; GitHub allows more. */
export const MAX_FILE_BYTES = 1024 * 1024;

/** Every admin branch starts with this, so `openProposals` finds them. */
export const BRANCH_PREFIX = 'admin/';

/** `owner/name`, or null when the setting has another shape. */
export function parseRepo(value) {
	const match = /^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/.exec(String(value ?? '').trim());
	if (!match || match[2] === '.' || match[2] === '..') return null;
	return { owner: match[1], name: match[2], full: `${match[1]}/${match[2]}` };
}

/**
 * The settings the module needs that are missing, by the names the project
 * gave them. A repo with the wrong shape counts as missing.
 */
export function missingGitHubSettings({ token, repo }, names) {
	const missing = [];
	if (!token) missing.push(names.token);
	if (!parseRepo(repo)) missing.push(names.repo);
	return missing;
}

/**
 * Whether the admin may write this path: inside one of `allowedPaths`, which
 * are folders (ending in `/`) or files. A path with `..`, a backslash, a
 * leading `/`, an empty part or a control character never is.
 */
export function mayWrite(path, allowedPaths) {
	const value = String(path ?? '');
	if (!value || value.startsWith('/') || value.includes('\\')) return false;
	// eslint-disable-next-line no-control-regex
	if (/[\u0000-\u001f\u007f]/.test(value)) return false;
	const parts = value.split('/');
	if (parts.some((part) => part === '' || part === '.' || part === '..')) return false;
	return (allowedPaths ?? []).some((allowed) =>
		allowed.endsWith('/') ? value.startsWith(allowed) && value.length > allowed.length : value === allowed
	);
}

/**
 * The branch for a key: `admin/` and the key in lower case, with anything
 * other than letters, digits and dashes turned into a dash. Null for a key
 * with nothing left.
 */
export function branchName(key) {
	const slug = String(key ?? '')
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9/]+/g, '-')
		.replace(/\/+/g, '/')
		.split('/')
		.map((part) => part.replace(/^-+|-+$/g, ''))
		.filter(Boolean)
		.join('/')
		.slice(0, 80)
		.replace(/[-/]+$/, '');
	return slug ? BRANCH_PREFIX + slug : null;
}

/**
 * Why a set of files cannot be proposed, or null when it can: `not-allowed`
 * for a path outside `allowedPaths`, a file over `MAX_FILE_BYTES`, content
 * that is not a string or null, the same path twice, or no files at all.
 */
export function filesProblem(files, allowedPaths) {
	if (!Array.isArray(files) || files.length === 0) return 'not-allowed';
	const seen = new Set();
	for (const file of files) {
		if (!file || !mayWrite(file.path, allowedPaths) || seen.has(file.path)) return 'not-allowed';
		seen.add(file.path);
		if (file.content === null) continue;
		if (typeof file.content !== 'string') return 'not-allowed';
		if (new TextEncoder().encode(file.content).length > MAX_FILE_BYTES) return 'not-allowed';
	}
	return null;
}

/**
 * The commit message: the title, and who changed it as a trailer when the
 * project passes it, so git shows who did what.
 */
export function commitMessage({ title, changedBy }) {
	const subject = String(title ?? '').replace(/\s+/g, ' ').trim() || 'Change from the admin';
	const who = String(changedBy ?? '').replace(/[\r\n]/g, '').trim();
	return who ? `${subject}\n\nChanged-by: ${who}` : subject;
}

/**
 * The outcome for an answer from GitHub that was not a success:
 * - `key-refused`: 401, or 403 that is not a rate limit; the token expired,
 *   was revoked, or lacks a permission. Also a 404 where the repo itself
 *   should exist, because GitHub answers 404 for a repo a token cannot see.
 * - `conflict`: 409 or 422; the branch moved while writing.
 * - `unavailable`: a rate limit (429, or 403 with no requests left), a 5xx,
 *   or anything else.
 */
export function outcomeFromStatus(status, remaining) {
	if (status === 401) return 'key-refused';
	if (status === 429 || (status === 403 && remaining === '0')) return 'unavailable';
	if (status === 403 || status === 404) return 'key-refused';
	if (status === 409 || status === 422) return 'conflict';
	return 'unavailable';
}

/** The text of a file from the contents API, which sends it in base64. */
export function decodeContent(base64) {
	const bytes = Uint8Array.from(atob(String(base64 ?? '').replace(/\s/g, '')), (c) =>
		c.charCodeAt(0)
	);
	return new TextDecoder().decode(bytes);
}

/** A path for the contents API, with each part encoded. */
export function encodePath(path) {
	return String(path).split('/').map(encodeURIComponent).join('/');
}
