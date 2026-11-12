import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAnalytics } from '../src/server.js';
import { periodRange } from '../src/rules.js';

const range = periodRange(7, new Date('2026-11-12T15:30:00Z'));

function fakeFetch(answers) {
	const calls = [];
	const fetch = async (url, init) => {
		calls.push({ url: new URL(url), init });
		const answer = answers.shift();
		if (answer instanceof Error) throw answer;
		return new Response(typeof answer.body === 'string' ? answer.body : JSON.stringify(answer.body), {
			status: answer.status ?? 200
		});
	};
	return { fetch, calls };
}

const keys = { token: 'secret', projectId: 'prj_1', teamId: 'team_1' };

// F-0005: without a key the feature is off and nothing is sent.
test('without a token or project id nothing is fetched', async () => {
	for (const options of [{ ...keys, token: '' }, { ...keys, projectId: '' }]) {
		const { fetch, calls } = fakeFetch([]);
		const analytics = createAnalytics({ ...options, fetch });
		assert.equal(analytics.enabled, false);
		assert.deepEqual(await analytics.totals(range), { ok: false, reason: 'no-key' });
		assert.deepEqual(await analytics.series(range, 'day'), { ok: false, reason: 'no-key' });
		assert.deepEqual(await analytics.breakdown(range, 'deviceType'), { ok: false, reason: 'no-key' });
		assert.equal(calls.length, 0);
	}
});

test('totals asks the count endpoint with the token, project and team', async () => {
	const { fetch, calls } = fakeFetch([{ body: { data: { visitors: 71, pageviews: 226 } } }]);
	const analytics = createAnalytics({ ...keys, fetch });
	assert.deepEqual(await analytics.totals(range), { ok: true, data: { visitors: 71, pageviews: 226 } });
	const { url, init } = calls[0];
	assert.equal(url.origin + url.pathname, 'https://api.vercel.com/v1/query/web-analytics/visits/count');
	assert.equal(url.searchParams.get('projectId'), 'prj_1');
	assert.equal(url.searchParams.get('teamId'), 'team_1');
	assert.equal(url.searchParams.get('since'), '2026-11-06T00:00:00.000Z');
	assert.equal(init.headers.Authorization, 'Bearer secret');
});

test('series and breakdown use the aggregate endpoint with "by"', async () => {
	const { fetch, calls } = fakeFetch([
		{ body: { data: [{ timestamp: '2026-11-07T00:00:00.000Z', visitors: 4, pageviews: 9 }] } },
		{ body: { data: [{ deviceType: 'mobile', visitors: 3, pageviews: 5 }] } }
	]);
	const analytics = createAnalytics({ ...keys, fetch });
	const series = await analytics.series(range, 'day');
	assert.equal(series.ok && series.data.length, 7);
	assert.deepEqual(calls[0].url.searchParams.getAll('by'), ['day']);
	const devices = await analytics.breakdown(range, 'deviceType', { limit: 5 });
	assert.deepEqual(devices, { ok: true, data: [{ deviceType: 'mobile', visitors: 3, pageviews: 5 }] });
	assert.deepEqual(calls[1].url.searchParams.getAll('by'), ['deviceType']);
	assert.equal(calls[1].url.searchParams.get('limit'), '5');
	assert.equal(calls[1].url.searchParams.has('filter'), false);
});

test('an answer is kept for an hour; a failure is not kept', async () => {
	let clock = 0;
	const { fetch, calls } = fakeFetch([
		{ status: 503, body: {} },
		{ body: { data: { visitors: 1, pageviews: 2 } } },
		{ body: { data: { visitors: 5, pageviews: 6 } } }
	]);
	const analytics = createAnalytics({ ...keys, fetch, now: () => clock });
	assert.deepEqual(await analytics.totals(range), { ok: false, reason: 'unavailable' });
	assert.deepEqual((await analytics.totals(range)).data, { visitors: 1, pageviews: 2 });
	clock = 59 * 60 * 1000;
	assert.deepEqual((await analytics.totals(range)).data, { visitors: 1, pageviews: 2 });
	assert.equal(calls.length, 2);
	clock = 61 * 60 * 1000;
	assert.deepEqual((await analytics.totals(range)).data, { visitors: 5, pageviews: 6 });
	assert.equal(calls.length, 3);
});

test('each failure gives its reason', async () => {
	const cases = [
		[{ status: 401, body: {} }, 'key-refused'],
		[{ status: 403, body: {} }, 'key-refused'],
		[{ status: 402, body: {} }, 'unavailable'],
		[{ status: 429, body: {} }, 'unavailable'],
		[{ status: 500, body: {} }, 'unavailable'],
		[new TypeError('fetch failed'), 'unavailable'],
		[{ status: 400, body: {} }, 'unexpected-response'],
		[{ status: 200, body: 'no json' }, 'unexpected-response'],
		[{ status: 200, body: { nothing: true } }, 'unexpected-response']
	];
	for (const [answer, reason] of cases) {
		const { fetch } = fakeFetch([answer]);
		const analytics = createAnalytics({ ...keys, fetch });
		assert.deepEqual(await analytics.totals(range), { ok: false, reason }, reason);
	}
	const { fetch } = fakeFetch([{ body: { data: { not: 'a list' } } }]);
	assert.deepEqual(await createAnalytics({ ...keys, fetch }).breakdown(range, 'deviceType'), {
		ok: false,
		reason: 'unexpected-response'
	});
});

test('no answer in time counts as unavailable', async () => {
	const slow = (url, init) =>
		new Promise((resolve, reject) => {
			init.signal.addEventListener('abort', () => reject(init.signal.reason));
		});
	// The timer of AbortSignal.timeout does not keep Node running; this one does.
	const keepAlive = setTimeout(() => {}, 1000);
	const analytics = createAnalytics({ ...keys, fetch: slow, timeoutMs: 20 });
	assert.deepEqual(await analytics.totals(range), { ok: false, reason: 'unavailable' });
	clearTimeout(keepAlive);
});
