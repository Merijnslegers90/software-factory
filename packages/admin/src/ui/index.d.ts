import type { Component, Snippet } from 'svelte';
import type { OVERVIEW_TEXT as OverviewText, SHELL_TEXT as ShellText } from './text.js';

export const AdminShell: Component<{
	/** The product's name, shown when there is no logo, and the logo's alt text. */
	name: string;
	/** The logo, a path such as `/images/logo.png`. */
	logo?: string;
	nav?: { href: string; label: string }[];
	/** Where "Bekijk site" goes; `/` by default. */
	siteUrl?: string;
	/** One message above every page, such as a setting that is missing. */
	message?: string;
	/** `/admin` by default. */
	base?: string;
	text?: Partial<typeof ShellText>;
	children?: Snippet;
}>;

export const AdminOverview: Component<{
	facts?: { label: string; value: string; href?: string }[];
	links?: { label: string; href: string; note?: string }[];
	text?: Partial<typeof OverviewText>;
	/** Summaries above the facts, such as AdminVisitorsSummary. */
	children?: Snippet;
}>;

export const AdminMessage: Component<{
	tone?: 'info' | 'warning' | 'error' | 'ok';
	text?: string;
	children?: Snippet;
}>;

export const AdminCard: Component<{ title?: string; level?: 2 | 3; children?: Snippet }>;

export const AdminField: Component<{
	id: string;
	label: string;
	hint?: string;
	error?: string;
	children: Snippet<[{ id: string; describedby: string | undefined; invalid: boolean }]>;
}>;

export { SHELL_TEXT, OVERVIEW_TEXT, withText } from './text.js';
