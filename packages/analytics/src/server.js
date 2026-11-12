// Reads Vercel Web Analytics on the server. The token can do more than read
// (F-0015), so it never leaves the server and nothing here sends it anywhere
// but api.vercel.com.

import { fillSeries, totalsFrom } from './rules.js';

const API = 'https://api.vercel.com/v1/query/web-analytics/visits';
const HOUR = 60 * 60 * 1000;

/**
 * The reason a call gave no numbers. A project shows its own sentence for each.
 * - `no-key`: the token or project id is empty; nothing was sent (F-0005).
 * - `key-refused`: Vercel answered 401 or 403; the token expired or was revoked.
 * - `unavailable`: 402, 429, 5xx, a network error or no answer in time.
 * - `unexpected-response`: any other answer, or one that is not what we expect.
 */
function reasonFor(status) {
	if (status === 401 || status === 403) return 'key-refused';
	if (status === 402 || status === 429 || status >= 500) return 'unavailable';
	return 'unexpected-response';
}

function iso(date) {
	return date.toISOString();
}

export function createAnalytics({
	token,
	projectId,
	teamId,
	fetch: doFetch = globalThis.fetch,
	cacheMs = HOUR,
	timeoutMs = 5000,
	now = Date.now
} = {}) {
	const enabled = Boolean(token && projectId);
	// Per server instance: on Vercel each instance keeps its own, which is fine
	// for numbers that are an hour old at most.
	const cache = new Map();

	async function query(kind, params) {
		if (!enabled) return { ok: false, reason: 'no-key' };

		const url = new URL(`${API}/${kind}`);
		url.searchParams.set('projectId', projectId);
		if (teamId) url.searchParams.set('teamId', teamId);
		for (const [name, value] of Object.entries(params)) {
			if (value === undefined || value === null || value === '') continue;
			if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(name, item));
			else url.searchParams.set(name, String(value));
		}

		const key = url.toString();
		const hit = cache.get(key);
		if (hit && hit.until > now()) return { ok: true, data: hit.data };

		let response;
		try {
			response = await doFetch(url, {
				headers: { Authorization: `Bearer ${token}` },
				signal: AbortSignal.timeout(timeoutMs)
			});
		} catch {
			return { ok: false, reason: 'unavailable' };
		}
		if (!response.ok) return { ok: false, reason: reasonFor(response.status) };

		let body;
		try {
			body = await response.json();
		} catch {
			return { ok: false, reason: 'unexpected-response' };
		}
		const data = body?.data;
		const fits = kind === 'aggregate' ? Array.isArray(data) : data && typeof data === 'object';
		if (!fits) return { ok: false, reason: 'unexpected-response' };

		// Only an answer is kept, never a failure, so the next visit tries again.
		for (const [old, entry] of cache) if (entry.until <= now()) cache.delete(old);
		cache.set(key, { data, until: now() + cacheMs });
		return { ok: true, data };
	}

	function map(result, change) {
		return result.ok ? { ok: true, data: change(result.data) } : result;
	}

	return {
		/** False when the token or project id is missing; the project shows the screen as off. */
		enabled,

		/** Unique visitors and pageviews in the range, from the count endpoint. */
		async totals(range) {
			const result = await query('count', { since: iso(range.since), until: iso(range.until) });
			return map(result, totalsFrom);
		},

		/** Visitors and pageviews per day or week, with the empty ones filled in. */
		async series(range, granularity) {
			const result = await query('aggregate', {
				by: [granularity],
				since: iso(range.since),
				until: iso(range.until),
				limit: 100
			});
			return map(result, (rows) => fillSeries(rows, range, granularity));
		},

		/**
		 * The raw rows broken down by one dimension (`requestPath`,
		 * `referrerHostname`, `utmCampaign`, `deviceType`, `country` and the like).
		 * Turn them into a list with `topList` or `shares` from the rules.
		 */
		async breakdown(range, dimension, { limit = 10, filter } = {}) {
			return query('aggregate', {
				by: [dimension],
				since: iso(range.since),
				until: iso(range.until),
				limit,
				filter
			});
		}
	};
}
