import type { Component, Snippet } from 'svelte';
import type { OVERVIEW_TEXT as OverviewText, SHELL_TEXT as ShellText } from './text.js';

/** The colours, fonts and rounding of one scheme; see the README for each key. */
export interface AdminThemeValues {
	bg?: string;
	surface?: string;
	text?: string;
	muted?: string;
	border?: string;
	inputBorder?: string;
	accent?: string;
	onAccent?: string;
	headerBg?: string;
	headerText?: string;
	error?: string;
	errorBg?: string;
	warningBg?: string;
	okBg?: string;
	font?: string;
	headingFont?: string;
	headingTransform?: string;
	radius?: string;
}

/** The product's own look (F-0020). What it leaves out keeps the default. */
export interface AdminTheme extends AdminThemeValues {
	/** `auto` follows the device (the default); `light` or `dark` fixes one. */
	scheme?: 'auto' | 'light' | 'dark';
	/** The same keys for the dark version. */
	dark?: AdminThemeValues;
}

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
	theme?: AdminTheme;
	/** False leaves out the link to the site. */
	showSiteLink?: boolean;
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
