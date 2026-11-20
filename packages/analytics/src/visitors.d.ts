import type { Analytics, FailureReason } from './server.js';
import type { Change, Granularity, SeriesPoint, TopItem, Totals } from './rules.js';

export interface VisitorsData {
	days: number;
	periods: number[];
	/** The query parameter for the period, `periode` by default. */
	param: string;
	enabled: boolean;
	reason: FailureReason | null;
	granularity?: Granularity;
	totals: Totals | null;
	change: { visitors: Change; pageviews: Change } | null;
	series: SeriesPoint[];
	pages: TopItem[];
	referrers: TopItem[];
}

export interface VisitorsSummaryData {
	enabled: boolean;
	reason: FailureReason | null;
	totals: Totals | null;
	change: { visitors: Change; pageviews: Change } | null;
}

export function loadVisitors(
	analytics: Analytics,
	url: URL,
	options?: { param?: string; limit?: number }
): Promise<VisitorsData>;
export function loadVisitorsSummary(analytics: Analytics): Promise<VisitorsSummaryData>;
export const DEFAULT_PERIOD: number;
