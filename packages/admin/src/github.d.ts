import type { ProposedFile } from './github-rules.js';

export type { ProposedFile };

/**
 * - `no-key`: the token or repo is missing; nothing was sent (F-0005).
 * - `key-refused`: GitHub refused the token (expired, revoked, a missing permission, or no access to the repo).
 * - `not-allowed`: a path outside `allowedPaths`, a file over 1 MB, or a key with nothing usable.
 * - `conflict`: the branch moved while writing; try again.
 * - `unavailable`: GitHub was slow, down or rate limited.
 * - `not-found`: `readFile` only; the file is not on the base branch.
 */
export type GitHubOutcome = 'no-key' | 'key-refused' | 'not-allowed' | 'conflict' | 'unavailable' | 'not-found';

export interface Proposal {
	number: number;
	url: string;
	title: string;
	branch: string;
	updatedAt: string;
}

type Failed = { outcome: Exclude<GitHubOutcome, 'not-found'> };

export interface ContentRepoOptions {
	/** `ADMIN_GITHUB_TOKEN`: a fine-grained token for this one repo, with Contents and Pull requests read and write. */
	token: string;
	/** `ADMIN_GITHUB_REPO`: `owner/name`. */
	repo: string;
	/** Folders (ending in `/`) and files the admin may write. Anything else is refused. */
	allowedPaths: readonly string[];
	/** `main` by default. */
	baseBranch?: string;
	/** The names of the settings in this project, for `missingSettings`. */
	settingNames?: Partial<{ token: string; repo: string }>;
	/** For tests. */
	fetch?: typeof fetch;
}

export interface ContentRepo {
	enabled: boolean;
	repo: string | null;
	baseBranch: string;
	allowedPaths: readonly string[];
	missingSettings(): string[];
	/** From the base branch, or from `ref`, such as the branch of an open proposal. */
	readFile(path: string, options?: { ref?: string }): Promise<{ outcome: 'ok'; content: string; sha: string } | { outcome: 'not-found' } | Failed>;
	listFiles(dir: string): Promise<
		| { outcome: 'ok'; files: { name: string; path: string; type: 'file' | 'dir'; sha: string }[] }
		| { outcome: 'not-found' }
		| Failed
	>;
	openProposals(): Promise<{ outcome: 'ok'; proposals: Proposal[] } | Failed>;
	/**
	 * One commit on `admin/<key>` and a pull request into the base branch, or
	 * a commit on top of the open one. Never merges.
	 */
	propose(input: {
		key: string;
		title: string;
		body?: string;
		files: ProposedFile[];
		/** Goes into the commit message as `Changed-by:`. */
		changedBy?: string;
	}): Promise<{ outcome: 'ok'; changed: boolean; proposal: Proposal | null } | Failed>;
}

export function createContentRepo(options: ContentRepoOptions): ContentRepo;
