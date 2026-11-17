// Changes content through a pull request (F-0018). Server-only: the token
// stays on the server. No dependencies, only fetch.
//
// The admin never merges. It writes one commit on a branch `admin/<key>` and
// opens a pull request; the owner merges it after the preview and the checks.

import {
	BRANCH_PREFIX,
	branchName,
	commitMessage,
	decodeContent,
	encodePath,
	filesProblem,
	isSafePath,
	missingGitHubSettings,
	outcomeFromStatus,
	parseRepo
} from './github-rules.js';

const DEFAULT_NAMES = { token: 'ADMIN_GITHUB_TOKEN', repo: 'ADMIN_GITHUB_REPO' };
const TIMEOUT_MS = 10_000;

/** An answer from GitHub that was not a success, carried to the caller as an outcome code. */
class Refused extends Error {
	constructor(outcome) {
		super(outcome);
		this.outcome = outcome;
	}
}

export function createContentRepo(options) {
	const names = { ...DEFAULT_NAMES, ...options.settingNames };
	const repo = parseRepo(options.repo);
	const missing = missingGitHubSettings({ token: String(options.token ?? '').trim(), repo: options.repo }, names);
	const enabled = missing.length === 0;
	const base = options.baseBranch ?? 'main';
	const allowedPaths = options.allowedPaths ?? [];
	const fetcher = options.fetch ?? globalThis.fetch;
	const token = String(options.token ?? '').trim();

	/** One call to the GitHub API. Throws `Refused` with an outcome code. */
	async function github(method, path, body, { notFound } = {}) {
		let response;
		try {
			response = await fetcher(`https://api.github.com/repos/${repo.full}${path}`, {
				method,
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${token}`,
					'X-GitHub-Api-Version': '2022-11-28',
					...(body ? { 'Content-Type': 'application/json' } : {})
				},
				body: body ? JSON.stringify(body) : undefined,
				signal: AbortSignal.timeout(TIMEOUT_MS)
			});
		} catch {
			throw new Refused('unavailable');
		}
		if (response.status === 404 && notFound) return notFound;
		if (!response.ok) {
			throw new Refused(
				outcomeFromStatus(response.status, response.headers.get('x-ratelimit-remaining'))
			);
		}
		try {
			return await response.json();
		} catch {
			throw new Refused('unavailable');
		}
	}

	/** Runs `work`, and turns a refusal into `{ outcome }`. */
	async function guarded(work) {
		if (!enabled) return { outcome: 'no-key' };
		try {
			return await work();
		} catch (error) {
			if (error instanceof Refused) return { outcome: error.outcome };
			// An answer with a shape we did not expect: never an error page.
			console.error('Admin: unexpected answer from GitHub.', error);
			return { outcome: 'unavailable' };
		}
	}

	const NOT_FOUND = Symbol('not found');

	function proposal(pull) {
		return {
			number: pull.number,
			url: pull.html_url,
			title: pull.title,
			branch: pull.head.ref,
			updatedAt: pull.updated_at
		};
	}

	/**
	 * The open pull request from this branch, into any base: a pull request
	 * that was retargeted still counts, so its branch is never reset.
	 */
	async function openPullFor(branch) {
		const pulls = await github(
			'GET',
			`/pulls?state=open&head=${encodeURIComponent(`${repo.owner}:${branch}`)}`
		);
		return pulls[0] ? proposal(pulls[0]) : null;
	}

	/** A 404 on a read: the file is missing, or the repo is out of the token's reach. */
	async function notFoundOrRefused() {
		await github('GET', '');
		return { outcome: 'not-found' };
	}

	/**
	 * A file on the base branch, or on `ref` (an admin branch with an open
	 * proposal, so a second save starts from the first): `{ outcome: 'ok',
	 * content, sha }`, or `not-found`.
	 */
	function readFile(path, { ref = base } = {}) {
		return guarded(async () => {
			if (!isSafePath(path)) return { outcome: 'not-allowed' };
			const file = await github(
				'GET',
				`/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`,
				null,
				{ notFound: NOT_FOUND }
			);
			if (file === NOT_FOUND) return notFoundOrRefused();
			if (Array.isArray(file) || file.type !== 'file') return { outcome: 'not-found' };
			// Over 1 MB GitHub sends no content (`encoding: none`): not for the admin.
			if (file.encoding !== 'base64') return { outcome: 'not-allowed' };
			return { outcome: 'ok', content: decodeContent(file.content), sha: file.sha };
		});
	}

	/** The files and folders directly in a folder on the base branch. */
	function listFiles(dir) {
		return guarded(async () => {
			const folder = String(dir ?? '').replace(/\/+$/, '');
			if (!isSafePath(folder)) return { outcome: 'not-allowed' };
			const entries = await github(
				'GET',
				`/contents/${encodePath(folder)}?ref=${encodeURIComponent(base)}`,
				null,
				{ notFound: NOT_FOUND }
			);
			if (entries === NOT_FOUND) {
				await github('GET', '');
				return { outcome: 'ok', files: [] };
			}
			if (!Array.isArray(entries)) return { outcome: 'not-found' };
			return {
				outcome: 'ok',
				files: entries.map(({ name, path, type, sha }) => ({ name, path, type, sha }))
			};
		});
	}

	/** The open pull requests from admin branches, newest first. */
	function openProposals() {
		return guarded(async () => {
			const pulls = [];
			// Five pages of 100 open pull requests is more than a product has.
			for (let page = 1; page <= 5; page++) {
				const batch = await github(
					'GET',
					`/pulls?state=open&base=${encodeURIComponent(base)}&sort=updated&direction=desc&per_page=100&page=${page}`
				);
				pulls.push(...batch);
				if (batch.length < 100) break;
			}
			return {
				outcome: 'ok',
				proposals: pulls.filter((p) => p.head.ref.startsWith(BRANCH_PREFIX)).map(proposal)
			};
		});
	}

	/**
	 * Writes the files in one commit on `admin/<key>` and opens a pull request,
	 * or adds the commit to the open one. `content: null` deletes a file.
	 */
	function propose({ key, title, body = '', files, changedBy }) {
		return guarded(async () => {
			const branch = branchName(key);
			if (!branch || filesProblem(files, allowedPaths)) return { outcome: 'not-allowed' };

			const existing = await github('GET', `/git/ref/${encodePath(`heads/${branch}`)}`, null, {
				notFound: NOT_FOUND
			});
			const open = existing === NOT_FOUND ? null : await openPullFor(branch);
			// A branch whose pull request was merged or closed starts again from the base.
			const parent = open
				? existing.object.sha
				: (await github('GET', `/git/ref/${encodePath(`heads/${base}`)}`)).object.sha;
			const parentCommit = await github('GET', `/git/commits/${parent}`);

			// GitHub answers 422 for a path it does not take (such as a `.git`
			// part) or for deleting a file that is not there; trying again does
			// not help, so that is `not-allowed`, not `conflict`.
			const tree = await github('POST', '/git/trees', {
				base_tree: parentCommit.tree.sha,
				tree: files.map((file) =>
					file.content === null
						? { path: file.path, mode: '100644', type: 'blob', sha: null }
						: { path: file.path, mode: '100644', type: 'blob', content: file.content }
				)
			}).catch((error) => {
				throw error instanceof Refused && error.outcome === 'conflict'
					? new Refused('not-allowed')
					: error;
			});
			if (tree.sha === parentCommit.tree.sha) {
				return { outcome: 'ok', changed: false, proposal: open };
			}

			const commit = await github('POST', '/git/commits', {
				message: commitMessage({ title, changedBy }),
				tree: tree.sha,
				parents: [parent]
			});
			if (existing === NOT_FOUND) {
				await github('POST', '/git/refs', { ref: `refs/heads/${branch}`, sha: commit.sha });
			} else {
				// Only a branch without any open pull request is reset; one with an
				// open pull request must move forward, or it is a conflict. The
				// `admin/` prefix belongs to the admin (F-0018).
				await github('PATCH', `/git/refs/${encodePath(`heads/${branch}`)}`, {
					sha: commit.sha,
					force: !open
				});
			}

			const pull =
				open ??
				proposal(
					await github('POST', '/pulls', { title: commitMessage({ title }), head: branch, base, body })
				);
			return { outcome: 'ok', changed: true, proposal: pull };
		});
	}

	return {
		enabled,
		repo: repo?.full ?? null,
		baseBranch: base,
		allowedPaths,
		/** The settings that are missing, by the project's names. Empty when the module is on. */
		missingSettings: () => [...missing],
		readFile,
		listFiles,
		openProposals,
		propose
	};
}
