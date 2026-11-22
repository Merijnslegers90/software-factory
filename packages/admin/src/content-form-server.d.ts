import type { ContentRepo, GitHubOutcome, Proposal } from './github.js';
import type { Field, FieldErrors, Values } from './content-form.js';

export interface ContentFormOptions {
	/** The JSON file in the repo, inside the repo's `allowedPaths`, such as `src/lib/content/menu.json`. */
	path: string;
	/** One proposal per topic: the branch is `admin/<key>`. */
	key: string;
	fields: Field[];
	/**
	 * The file as the site was built with it: shown when GitHub is not set up,
	 * and where the form starts when the file is not on GitHub yet.
	 */
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

export interface ContentSection extends ContentFormOptions {
	/** The tab's name, such as `Menu`. */
	label: string;
	/** The title of the pull request this section opens. */
	title: string;
}

export interface ContentData {
	content: {
		sections: { key: string; label: string; href: string; proposal: boolean }[];
		/** The key of the section on screen. */
		active: string;
		fields: Field[];
		form: ContentFormData;
	};
}

export interface ContentOptions {
	/** Where the route is, `/admin/content` by default. */
	base?: string;
	/** The name of the optional route parameter, `section` by default (`[[section]]`). */
	param?: string;
	/** Who saved, for the commit message; a function gets the request event. */
	changedBy?: string | ((event: { locals: App.Locals }) => string | undefined);
}

/**
 * One Content page with a tab per section (#37). Throws when the list is not
 * right: an empty list, a key or file twice, a key that is not a-z, 0-9 and
 * -, or fields that checkFields refuses.
 */
export function defineContent(
	repo: ContentRepo,
	sections: ContentSection[],
	options?: ContentOptions
): {
	load(event: { params: Record<string, string | undefined> }): Promise<ContentData>;
	actions: {
		default(event: {
			request: Request;
			locals: App.Locals;
			params: Record<string, string | undefined>;
		}): Promise<SaveResult | import('@sveltejs/kit').ActionFailure<SaveResult>>;
	};
};
