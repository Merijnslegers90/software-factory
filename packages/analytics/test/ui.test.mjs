import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderComponent, textOf } from '../../../tests/svelte-render.mjs';
import { loadVisitors, loadVisitorsSummary } from '../src/visitors.js';
import { barWidth, changeText, number, seriesLabel } from '../src/ui/shared.js';

// F-0020: the visitor blocks get their data in one call, and render with it
// and without the settings (F-0005).

function fakeAnalytics({ enabled = true, fail = null } = {}) {
	const calls = [];
	const answer = (data) => (fail ? { ok: false, reason: fail } : { ok: true, data });
	return {
		calls,
		enabled,
		async totals(range) {
			calls.push(['totals', range]);
			return answer(calls.filter((c) => c[0] === 'totals').length === 1 ? { visitors: 120, pageviews: 300 } : { visitors: 100, pageviews: 300 });
		},
		async series(range, granularity) {
			calls.push(['series', granularity]);
			return answer([{ start: '2026-11-01', visitors: 4, pageviews: 9 }]);
		},
		async breakdown(range, dimension) {
			calls.push(['breakdown', dimension]);
			return answer(
				dimension === 'requestPath'
					? [{ requestPath: '/menu-en-prijzen', visitors: 50, pageviews: 90 }]
					: [{ referrerHostname: '', visitors: 30, pageviews: 40 }, { referrerHostname: 'google.com', visitors: 20, pageviews: 25 }]
			);
		}
	};
}

test('loadVisitors reads the period from the URL, and compares with the period before', async () => {
	const analytics = fakeAnalytics();
	const data = await loadVisitors(analytics, new URL('http://x/admin/bezoekers?periode=90'));
	assert.equal(data.days, 90);
	assert.equal(data.granularity, 'week');
	assert.deepEqual(data.totals, { visitors: 120, pageviews: 300 });
	assert.deepEqual(data.change, { visitors: 20, pageviews: 0 });
	assert.equal(data.pages[0].key, '/menu-en-prijzen');
	assert.equal(data.referrers.length, 2);
	assert.deepEqual(data.periods, [7, 30, 90]);
	assert.equal((await loadVisitors(analytics, new URL('http://x/?periode=12'))).days, 30);
	assert.equal((await loadVisitors(analytics, new URL('http://x/?p=7'), { param: 'p' })).days, 7);
});

test('without the settings nothing is asked from Vercel (F-0005)', async () => {
	const analytics = fakeAnalytics({ enabled: false });
	const data = await loadVisitors(analytics, new URL('http://x/'));
	assert.equal(data.reason, 'no-key');
	assert.equal(analytics.calls.length, 0);
	assert.deepEqual(await loadVisitorsSummary(analytics), { enabled: false, reason: 'no-key', totals: null, change: null });
});

test('a refusal from Vercel becomes the reason, not an error', async () => {
	const data = await loadVisitors(fakeAnalytics({ fail: 'key-refused' }), new URL('http://x/'));
	assert.equal(data.reason, 'key-refused');
	assert.equal(data.totals, null);
	assert.deepEqual(data.pages, []);
});

test('numbers, changes and bars in Dutch', () => {
	assert.equal(number(1234), '1.234');
	assert.deepEqual(changeText(12, 'nieuw'), { text: '+12%', direction: 'up' });
	assert.deepEqual(changeText(-3, 'nieuw'), { text: '−3%', direction: 'down' });
	assert.deepEqual(changeText('new', 'nieuw'), { text: 'nieuw', direction: 'up' });
	assert.equal(changeText(undefined, 'nieuw'), null);
	assert.equal(seriesLabel('2026-11-03'), '3 nov');
	assert.equal(barWidth(5, 10), 50);
	assert.equal(barWidth(0, 10), 2);
	assert.equal(barWidth(0, 0), 0);
});

const ui = (name) => `packages/analytics/src/ui/${name}.svelte`;

test('the visitors block shows totals, the change, the top lists and the periods', async () => {
	const data = await loadVisitors(fakeAnalytics(), new URL('http://x/?periode=30'));
	const html = await renderComponent(ui('AdminVisitors'), { data });
	const text = textOf(html);
	assert.match(text, /Bezoekers 120 \+20% ten opzichte van de periode ervoor/);
	assert.match(text, /\/menu-en-prijzen 90/);
	assert.match(text, /Direct of onbekend 30/);
	assert.match(html, /href="\?periode=30" aria-current="true"/);
	assert.match(html, /<table/);
});

test('the visitors block says what is missing, in the product’s words if it likes', async () => {
	const data = await loadVisitors(fakeAnalytics({ enabled: false }), new URL('http://x/'));
	assert.match(textOf(await renderComponent(ui('AdminVisitors'), { data })), /de sleutel voor Vercel Analytics ontbreekt/);
	const english = await renderComponent(ui('AdminVisitors'), { data, text: { title: 'Visitors' } });
	assert.match(textOf(english), /^Visitors/);
});

test('the summary is left out without the settings, and links to the full block', async () => {
	const off = await loadVisitorsSummary(fakeAnalytics({ enabled: false }));
	assert.equal(textOf(await renderComponent(ui('AdminVisitorsSummary'), { data: off })), '');
	const on = await loadVisitorsSummary(fakeAnalytics());
	const html = await renderComponent(ui('AdminVisitorsSummary'), { data: on, href: '/admin/bezoekers' });
	assert.match(textOf(html), /Bezoekers: deze maand Bezoekers 120 \+20%/);
	assert.match(html, /href="\/admin\/bezoekers"/);
});

test('a product switches parts of the visitors block off', async () => {
	const data = await loadVisitors(fakeAnalytics(), new URL('http://x/?periode=30'));
	const html = await renderComponent(ui('AdminVisitors'), { data, show: { referrers: false, periods: false } });
	assert.doesNotMatch(textOf(html), /Waar bezoekers vandaan komen/);
	assert.doesNotMatch(html, /\?periode=/);
	assert.match(textOf(html), /Meest bekeken pagina/);
});
