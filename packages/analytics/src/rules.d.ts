export interface Range {
	since: Date;
	until: Date;
}

export interface PeriodRange extends Range {
	/** The period of the same length just before, to compare with. */
	previous: Range;
}

export type Granularity = 'day' | 'week';

export interface Totals {
	visitors: number;
	pageviews: number;
}

export interface SeriesPoint extends Totals {
	/** The first day of the bucket, `YYYY-MM-DD` in UTC. */
	start: string;
}

export interface TopItem extends Totals {
	/** The value of the dimension, such as a path or a hostname; `null` for the other row. */
	key: string | null;
	/** True for the row that holds everything outside the top. */
	other: boolean;
}

export interface Share extends TopItem {
	/** Whole percent of the visitors; all shares add up to 100. */
	percent: number;
}

export type Change = number | 'new';

export const PERIODS: readonly number[];
export const DEFAULT_PERIOD: number;

export function parsePeriod(value: string | null | undefined): number;
export function periodRange(days: number, now?: Date): PeriodRange;
export function monthToDate(now?: Date): PeriodRange;
export function granularityFor(days: number): Granularity;
export function change(current: number, previous: number): Change;
export function buckets(range: Range, granularity: Granularity): string[];
export function fillSeries(rows: unknown[], range: Range, granularity: Granularity): SeriesPoint[];
export function totalsFrom(data: unknown): Totals;
export function topList(
	rows: unknown[],
	dimension: string,
	options?: { limit?: number; sortBy?: 'visitors' | 'pageviews' }
): TopItem[];
export function shares(rows: unknown[], dimension: string): Share[];
