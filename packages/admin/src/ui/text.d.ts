export const SHELL_TEXT: Readonly<
	Record<'admin' | 'menu' | 'closeMenu' | 'viewSite' | 'logout' | 'newWindow' | 'open' | 'loggedIn', string>
>;
export const OVERVIEW_TEXT: Readonly<Record<'facts' | 'links' | 'morning' | 'afternoon' | 'evening', string>>;
export const TODO_TEXT: Readonly<Record<'title' | 'none', string>>;
export const PROPOSALS_TEXT: Readonly<
	Record<'title' | 'none' | 'intro' | 'updated' | 'open' | 'off' | 'todoOne' | 'todoMany', string> & { outcomes: Readonly<Record<string, string>> }
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

export interface NavItem {
	href: string;
	label: string;
	count?: number;
}
export interface NavGroup {
	title?: string;
	items: NavItem[];
}
export function navGroups(nav?: (NavItem | NavGroup)[]): NavGroup[];
export function countLabel(count: unknown): string;
export function totalCount(groups: NavGroup[]): number;
export function titleWithCount(title: string, total: number): string;
export function greeting(date: Date, timeZone?: string, text?: { morning: string; afternoon: string; evening: string }): string;
export function longDate(date: Date, timeZone?: string): string;
export function proposalsTodo(
	data: import('../content-form-server.js').ProposalsData,
	text?: { todoOne: string; todoMany: string }
): { count: number; text: string; href: string }[];
