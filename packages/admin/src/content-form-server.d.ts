import type { ContentRepo, GitHubOutcome, Proposal } from './github.js';
import type { Field, FieldErrors, Values } from './content-form.js';

export interface ContentFormOptions {
	/** The JSON file in the repo, inside the repo's `allowedPaths`, such as `src/lib/content/menu.json`. */
	path: string;
	/** One proposal per topic: the branch is `admin/<key>`. */
	key: string;
	fields: Field[];
	/** The file as the site was built with it, shown when GitHub is not set up. */
	current?: unknown;
}

export type FormOutcome = 'ok' | 'mismatch' | Exclude<GitHubOutcome, 'not-found'>;

export interface ContentFormData {
	values: Values | null;
	proposal: Proposal | null;
	canSave: boolean;
	outcome: FormOutcome;
	/** Where the file stopped matching the fields, such as `kaarten.2.prijs`. */
	mismatchAt: string | null;
	/** The settings that are missing, such as `ADMIN_GITHUB_TOKEN` (F-0005). */
	missing: string[];
}

export type SaveResult =
	| { ok: true; changed: boolean; proposal: Proposal | null }
	| { ok: false; errors: FieldErrors }
	| { ok: false; outcome: Exclude<FormOutcome, 'ok'> };

export function loadContentForm(repo: ContentRepo, options: ContentFormOptions): Promise<ContentFormData>;

export function saveContentForm(
	repo: ContentRepo,
	options: ContentFormOptions & { title: string; value: unknown; changedBy?: string }
): Promise<SaveResult>;

export function contentFormAction(
	repo: ContentRepo,
	options: ContentFormOptions & {
		title: string;
		/** Who saved, for the commit message; a function gets the request event. */
		changedBy?: string | ((event: { locals: App.Locals }) => string | undefined);
	}
): (
	event: { request: Request; locals: App.Locals }
) => Promise<SaveResult | import('@sveltejs/kit').ActionFailure<SaveResult>>;

export interface ProposalsData {
	outcome: 'ok' | Exclude<GitHubOutcome, 'not-found'>;
	proposals: Proposal[];
	missing: string[];
}

export function loadProposals(repo: ContentRepo): Promise<ProposalsData>;
