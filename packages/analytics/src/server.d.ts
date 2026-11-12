import type { Granularity, Range, SeriesPoint, Totals } from './rules.js';

export type FailureReason = 'no-key' | 'key-refused' | 'unavailable' | 'unexpected-response';

export type Result<T> = { ok: true; data: T } | { ok: false; reason: FailureReason };

export interface AnalyticsOptions {
	/** A Vercel access token, scoped to the team, read at runtime (F-0005, F-0015). */
	token: string;
	/** The Vercel project, `prj_...` or its name. */
	projectId: string;
	/** The Vercel team, `team_...`; empty for a personal account. */
	teamId?: string;
	/**
	 * Paths to leave out of every number, such as `['/admin']`. Vercel keeps
	 * counting only production; this filter comes on top.
	 */
	excludePaths?: string[];
	/** For tests. */
	fetch?: typeof fetch;
	/** How long an answer is kept, one hour by default. */
	cacheMs?: number;
	/** How long to wait for Vercel, five seconds by default. */
	timeoutMs?: number;
	/** For tests. */
	now?: () => number;
}

export interface Analytics {
	enabled: boolean;
	totals(range: Range): Promise<Result<Totals>>;
	series(range: Range, granularity: Granularity): Promise<Result<SeriesPoint[]>>;
	breakdown(
		range: Range,
		dimension: string,
		options?: { limit?: number; filter?: string }
	): Promise<Result<Record<string, unknown>[]>>;
}

export function createAnalytics(options: AnalyticsOptions): Analytics;
