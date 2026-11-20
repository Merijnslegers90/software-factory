import type { Component } from 'svelte';
import type { VisitorsData, VisitorsSummaryData } from '../visitors.js';

export const VISITORS_TEXT: Readonly<Record<string, string> & { reasons: Readonly<Record<string, string>> }>;

export const AdminVisitors: Component<{
	/** From loadVisitors in the page's load. */
	data: VisitorsData;
	text?: Partial<typeof VISITORS_TEXT>;
}>;

export const AdminVisitorsSummary: Component<{
	/** From loadVisitorsSummary in the overview's load. */
	data: VisitorsSummaryData;
	/** The page with AdminVisitors; `/admin/bezoekers` by default. */
	href?: string;
	text?: Partial<typeof VISITORS_TEXT>;
}>;
