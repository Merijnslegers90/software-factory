// The pure rules of the visitor numbers (F-0006): periods, change, series and
// top lists. Nothing here calls Vercel; server.js does that.
//
// Days are UTC days, because that is how Vercel buckets them. Totals, series
// and the dashboard then agree with each other.

const DAY = 24 * 60 * 60 * 1000;

export const PERIODS = Object.freeze([7, 30, 90]);
export const DEFAULT_PERIOD = 30;

/** The period from `?period=`; anything else falls back to 30 days. */
export function parsePeriod(value) {
	if (value === null || value === undefined || value === '') return DEFAULT_PERIOD;
	const days = Number(value);
	return PERIODS.includes(days) ? days : DEFAULT_PERIOD;
}

function startOfDay(date) {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfWeek(date) {
	const day = startOfDay(date);
	// Vercel's weeks start on Monday; getUTCDay() is 0 on Sunday.
	const sinceMonday = (day.getUTCDay() + 6) % 7;
	return new Date(day.getTime() - sinceMonday * DAY);
}

/**
 * The last `days` days up to now, today included, and the period of the same
 * length before it. The previous period ends at the same time of day as now,
 * so half a day today is compared with half a day back then.
 */
export function periodRange(days, now = new Date()) {
	const since = new Date(startOfDay(now).getTime() - (days - 1) * DAY);
	const shift = days * DAY;
	return {
		since,
		until: now,
		previous: {
			since: new Date(since.getTime() - shift),
			until: new Date(now.getTime() - shift)
		}
	};
}

/**
 * This month up to now, and the same days of the previous month. Comparing with
 * the whole previous month would show a drop halfway through every month.
 */
export function monthToDate(now = new Date()) {
	const year = now.getUTCFullYear();
	const month = now.getUTCMonth();
	const daysInPrevious = new Date(Date.UTC(year, month, 0)).getUTCDate();
	const day = Math.min(now.getUTCDate(), daysInPrevious);
	return {
		since: new Date(Date.UTC(year, month, 1)),
		until: now,
		previous: {
			since: new Date(Date.UTC(year, month - 1, 1)),
			until: new Date(
				Date.UTC(
					year,
					month - 1,
					day,
					now.getUTCHours(),
					now.getUTCMinutes(),
					now.getUTCSeconds(),
					now.getUTCMilliseconds()
				)
			)
		}
	};
}

/** Per day up to 30 days; per week beyond, since 90 bars do not read on a phone. */
export function granularityFor(days) {
	return days > 30 ? 'week' : 'day';
}

/** The change in whole percent, or 'new' when there was nothing before. */
export function change(current, previous) {
	if (!previous) return current > 0 ? 'new' : 0;
	return Math.round(((current - previous) / previous) * 100);
}

/** The start of every day or week in the range, as `YYYY-MM-DD`. */
export function buckets(range, granularity) {
	const step = granularity === 'week' ? 7 * DAY : DAY;
	const first = granularity === 'week' ? startOfWeek(range.since) : startOfDay(range.since);
	const starts = [];
	for (let time = first.getTime(); time <= range.until.getTime(); time += step) {
		starts.push(new Date(time).toISOString().slice(0, 10));
	}
	return starts;
}

function count(value) {
	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? number : 0;
}

/** Vercel leaves out the days without visits; this puts them back as zero. */
export function fillSeries(rows, range, granularity) {
	const byStart = new Map();
	for (const row of rows ?? []) {
		if (typeof row?.timestamp !== 'string') continue;
		byStart.set(row.timestamp.slice(0, 10), row);
	}
	return buckets(range, granularity).map((start) => {
		const row = byStart.get(start);
		return { start, visitors: count(row?.visitors), pageviews: count(row?.pageviews) };
	});
}

/** The totals from the count endpoint, with zero for what is missing. */
export function totalsFrom(data) {
	return { visitors: count(data?.visitors), pageviews: count(data?.pageviews) };
}

/**
 * The rows of a breakdown as a top list, sorted on `sortBy`. Vercel's own
 * "Others" group, and whatever falls beyond `limit`, become one row with
 * `other: true` at the bottom; the project gives it its own word.
 */
export function topList(rows, dimension, { limit = 10, sortBy = 'visitors' } = {}) {
	const items = [];
	const other = { key: null, other: true, visitors: 0, pageviews: 0 };
	for (const row of rows ?? []) {
		const key = typeof row?.[dimension] === 'string' ? row[dimension] : '';
		const item = { key, other: false, visitors: count(row?.visitors), pageviews: count(row?.pageviews) };
		if (key === 'Others') {
			other.visitors += item.visitors;
			other.pageviews += item.pageviews;
		} else {
			items.push(item);
		}
	}
	const second = sortBy === 'visitors' ? 'pageviews' : 'visitors';
	items.sort((a, b) => b[sortBy] - a[sortBy] || b[second] - a[second] || a.key.localeCompare(b.key));
	for (const item of items.slice(limit)) {
		other.visitors += item.visitors;
		other.pageviews += item.pageviews;
	}
	const top = items.slice(0, limit);
	if (other.visitors > 0 || other.pageviews > 0) top.push(other);
	return top;
}

/**
 * Each value's share of the visitors in whole percent, largest first. The
 * percentages add up to exactly 100 (largest remainder), so a bar of shares
 * is always full.
 */
export function shares(rows, dimension) {
	const list = topList(rows, dimension, { limit: Infinity });
	const total = list.reduce((sum, item) => sum + item.visitors, 0);
	if (total === 0) return [];
	const exact = list.map((item) => (item.visitors / total) * 100);
	const result = list.map((item, i) => ({ ...item, percent: Math.floor(exact[i]) }));
	let left = 100 - result.reduce((sum, item) => sum + item.percent, 0);
	const order = exact
		.map((value, i) => ({ i, rest: value - Math.floor(value) }))
		.sort((a, b) => b.rest - a.rest);
	for (const { i } of order) {
		if (left <= 0) break;
		result[i].percent += 1;
		left -= 1;
	}
	return result.filter((item) => item.visitors > 0);
}
