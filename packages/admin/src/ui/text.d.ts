export const SHELL_TEXT: Readonly<Record<'admin' | 'menu' | 'closeMenu' | 'viewSite' | 'logout' | 'newWindow', string>>;
export const OVERVIEW_TEXT: Readonly<Record<'facts' | 'links', string>>;
export const PROPOSALS_TEXT: Readonly<
	Record<'title' | 'none' | 'intro' | 'updated' | 'open' | 'off', string> & { outcomes: Readonly<Record<string, string>> }
>;
export const FORM_TEXT: Readonly<
	Record<
		| 'save'
		| 'saving'
		| 'add'
		| 'remove'
		| 'up'
		| 'down'
		| 'item'
		| 'empty'
		| 'yes'
		| 'openProposal'
		| 'saved'
		| 'unchanged'
		| 'viewProposal'
		| 'leave'
		| 'fixErrors'
		| 'priceHint',
		string
	> & { errors: Readonly<Record<string, string>>; outcomes: Readonly<Record<string, string>> }
>;
export const CONTENT_TEXT: Readonly<Record<'sections' | 'proposal', string>>;
export function withText<T extends object>(defaults: T, text?: Partial<T> | null): T;
export function fill(text: string, values?: Record<string, unknown>): string;
export function joinNames(names: string[]): string;
export function shortDate(iso: string, locale?: string): string;
export function isCurrent(href: string, pathname: string, base?: string): boolean;
