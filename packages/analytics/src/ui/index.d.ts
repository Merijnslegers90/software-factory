import type { Component } from 'svelte';
import type { VisitorsData, VisitorsSummaryData } from '../visitors.js';

export interface VisitorsText {
	[key: string]: string | Readonly<Record<string, string>>;
	reasons: Readonly<Record<string, string>>;
}

export const VISITORS_TEXT: Readonly<VisitorsText>;

type TextOverride = { [K in keyof VisitorsText]?: K extends 'reasons' ? Partial<VisitorsText['reasons']> : string };

export const AdminVisitors: Component<{
	/** From loadVisitors in the page's load. */
	data: VisitorsData;
	text?: TextOverride;
}>;

export const AdminVisitorsSummary: Component<{
	/** From loadVisitorsSummary in the overview's load. */
	data: VisitorsSummaryData;
	/** The page with AdminVisitors; `/admin/bezoekers` by default. */
	href?: string;
	text?: TextOverride;
}>;
