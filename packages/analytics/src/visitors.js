// The data for the visitor blocks of F-0020, in one call each, so a page in
// the admin is a few lines. Server only: it calls Vercel through createAnalytics.

import {
	DEFAULT_PERIOD,
	PERIODS,
	change,
	granularityFor,
	monthToDate,
	parsePeriod,
	periodRange,
	topList
} from './rules.js';

/**
 * Everything AdminVisitors shows, for the period in `?<param>=` (7, 30 or 90
 * days). Without the settings it says so instead of failing (F-0005).
 */
export async function loadVisitors(analytics, url, { param = 'periode', limit = 50 } = {}) {
	const days = parsePeriod(url.searchParams.get(param));
	const base = { days, periods: [...PERIODS], param, enabled: analytics.enabled };
	if (!analytics.enabled) return { ...base, reason: 'no-key', totals: null, change: null, series: [], pages: [], referrers: [] };

	const range = periodRange(days);
	const [now, before, series, pages, referrers] = await Promise.all([
		analytics.totals(range),
		analytics.totals(range.previous),
		analytics.series(range, granularityFor(days)),
		analytics.breakdown(range, 'requestPath', { limit }),
		analytics.breakdown(range, 'referrerHostname', { limit })
	]);
	return {
		...base,
		reason: now.ok ? null : now.reason,
		granularity: granularityFor(days),
		totals: now.ok ? now.data : null,
		change:
			now.ok && before.ok
				? {
						visitors: change(now.data.visitors, before.data.visitors),
						pageviews: change(now.data.pageviews, before.data.pageviews)
					}
				: null,
		series: series.ok ? series.data : [],
		pages: pages.ok ? topList(pages.data, 'requestPath', { sortBy: 'pageviews' }) : [],
		referrers: referrers.ok ? topList(referrers.data, 'referrerHostname') : []
	};
}

/** The totals for the overview: this month so far against the same days of last month. */
export async function loadVisitorsSummary(analytics) {
	if (!analytics.enabled) return { enabled: false, reason: 'no-key', totals: null, change: null };
	const range = monthToDate();
	const [now, before] = await Promise.all([
		analytics.totals(range),
		analytics.totals(range.previous)
	]);
	return {
		enabled: true,
		reason: now.ok ? null : now.reason,
		totals: now.ok ? now.data : null,
		change:
			now.ok && before.ok
				? {
						visitors: change(now.data.visitors, before.data.visitors),
						pageviews: change(now.data.pageviews, before.data.pageviews)
					}
				: null
	};
}

export { DEFAULT_PERIOD };
