import type { Component, Snippet } from 'svelte';
import type {
	OVERVIEW_TEXT as OverviewText,
	SHELL_TEXT as ShellText,
	TODO_TEXT as TodoText
} from './text.js';

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
	/** `uppercase` gives the menu capitals, as Van Veldeke has (#43). */
	navTransform?: string;
	radius?: string;
}

/** The product's own look (F-0020). What it leaves out keeps the default. */
export interface AdminTheme extends AdminThemeValues {
	/** `auto` follows the device (the default); `light` or `dark` fixes one. */
	scheme?: 'auto' | 'light' | 'dark';
	/** The same keys for the dark version. */
	dark?: AdminThemeValues;
}

export interface AdminNavItem {
	href: string;
	label: string;
	/** What is open here; above 0 it shows as a badge. */
	count?: number;
}

export interface AdminNavGroup {
	title?: string;
	items: AdminNavItem[];
}

export const AdminShell: Component<{
	/** The product's name, shown when there is no logo, and the logo's alt text. */
	name: string;
	/** The logo, a path such as `/images/logo.png`. */
	logo?: string;
	/**
	 * The menu: groups (#43), or a flat list, which is one group without a
	 * title. An item's `count` above 0 shows as a badge; the total goes on the
	 * phone's menu button and in the tab title.
	 */
	nav?: (AdminNavItem | AdminNavGroup)[];
	/** Where "Bekijk site" goes; `/` by default. */
	siteUrl?: string;
	/** One message above every page, such as a setting that is missing. */
	message?: string;
	/** `/admin` by default. */
	base?: string;
	theme?: AdminTheme;
	/** False leaves out the link to the site. */
	showSiteLink?: boolean;
	/** Who is logged in, shown above "Uitloggen", such as `locals.admin.email`. */
	user?: string;
	/** The tab title, `Admin <name>` by default; what is open goes in front. */
	title?: string;
	text?: Partial<typeof ShellText>;
	children?: Snippet;
}>;

export const AdminOverview: Component<{
	facts?: { label: string; value: string; href?: string }[];
	links?: { label: string; href: string; note?: string }[];
	/** A head with the date and a greeting by the time of day (#43). */
	greet?: boolean;
	/** The name after the greeting, such as "Gerard"; the product maps it from the login. */
	name?: string;
	/** The moment for the date and greeting, now by default. */
	now?: Date;
	/** `Europe/Amsterdam` by default; the server may run in another zone. */
	timeZone?: string;
	text?: Partial<typeof OverviewText>;
	/** Summaries above the facts, such as AdminVisitorsSummary. */
	children?: Snippet;
}>;

/** What is waiting (#43): a line per thing, with a count, a text and a link. */
export const AdminTodo: Component<{
	items?: { count?: number; text: string; href: string }[];
	text?: Partial<typeof TodoText>;
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

export { SHELL_TEXT, OVERVIEW_TEXT, TODO_TEXT, withText } from './text.js';
