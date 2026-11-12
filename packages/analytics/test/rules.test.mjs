import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	buckets,
	change,
	fillSeries,
	granularityFor,
	monthToDate,
	parsePeriod,
	periodRange,
	shares,
	topList,
	totalsFrom
} from '../src/rules.js';

// F-0006: the rules are pure and tested; F-0015: every product shows these numbers.

const at = (iso) => new Date(iso);

test('parsePeriod takes 7, 30 or 90 and falls back to 30', () => {
	assert.equal(parsePeriod('7'), 7);
	assert.equal(parsePeriod('90'), 90);
	for (const value of [null, undefined, '', 'abc', '365', '0', '-7', '7.5']) {
		assert.equal(parsePeriod(value), 30, String(value));
	}
});

test('periodRange counts today as a day, and compares with the same length before', () => {
	const range = periodRange(7, at('2026-11-12T15:30:00Z'));
	assert.equal(range.since.toISOString(), '2026-11-06T00:00:00.000Z');
	assert.equal(range.until.toISOString(), '2026-11-12T15:30:00.000Z');
	assert.equal(range.previous.since.toISOString(), '2026-10-30T00:00:00.000Z');
	assert.equal(range.previous.until.toISOString(), '2026-11-05T15:30:00.000Z');
});

test('monthToDate compares with the same days of the previous month', () => {
	const range = monthToDate(at('2026-11-12T15:30:00Z'));
	assert.equal(range.since.toISOString(), '2026-11-01T00:00:00.000Z');
	assert.equal(range.previous.since.toISOString(), '2026-10-01T00:00:00.000Z');
	assert.equal(range.previous.until.toISOString(), '2026-10-12T15:30:00.000Z');
});

test('monthToDate stops at the last day of a shorter previous month', () => {
	const range = monthToDate(at('2026-03-31T10:00:00Z'));
	assert.equal(range.previous.until.toISOString(), '2026-02-28T10:00:00.000Z');
});

test('monthToDate in January looks back at December', () => {
	const range = monthToDate(at('2027-01-05T08:00:00Z'));
	assert.equal(range.previous.since.toISOString(), '2026-12-01T00:00:00.000Z');
	assert.equal(range.previous.until.toISOString(), '2026-12-05T08:00:00.000Z');
});

test('granularityFor: per day up to 30 days, per week beyond', () => {
	assert.equal(granularityFor(7), 'day');
	assert.equal(granularityFor(30), 'day');
	assert.equal(granularityFor(90), 'week');
});

test('change in whole percent, "new" after nothing, 0 when both are empty', () => {
	assert.equal(change(112, 100), 12);
	assert.equal(change(50, 100), -50);
	assert.equal(change(1, 3), -67);
	assert.equal(change(5, 0), 'new');
	assert.equal(change(0, 0), 0);
});

test('buckets: one per day, or per week starting on Monday', () => {
	const range = periodRange(7, at('2026-11-12T15:30:00Z'));
	assert.deepEqual(buckets(range, 'day'), [
		'2026-11-06',
		'2026-11-07',
		'2026-11-08',
		'2026-11-09',
		'2026-11-10',
		'2026-11-11',
		'2026-11-12'
	]);
	// 6 November 2026 is a Friday; its week starts on Monday 2 November.
	assert.deepEqual(buckets(range, 'week'), ['2026-11-02', '2026-11-09']);
	assert.equal(buckets(periodRange(30, at('2026-11-12T00:00:00Z')), 'day').length, 30);
});

test('fillSeries puts the days without visits back as zero', () => {
	const range = periodRange(7, at('2026-11-12T15:30:00Z'));
	const series = fillSeries(
		[
			{ timestamp: '2026-11-07T00:00:00.000Z', visitors: 4, pageviews: 9 },
			{ timestamp: '2026-11-12T00:00:00.000Z', visitors: '2', pageviews: 3 },
			{ timestamp: 42 }
		],
		range,
		'day'
	);
	assert.equal(series.length, 7);
	assert.deepEqual(series[0], { start: '2026-11-06', visitors: 0, pageviews: 0 });
	assert.deepEqual(series[1], { start: '2026-11-07', visitors: 4, pageviews: 9 });
	assert.deepEqual(series[6], { start: '2026-11-12', visitors: 2, pageviews: 3 });
	assert.deepEqual(fillSeries(undefined, range, 'day')[3], { start: '2026-11-09', visitors: 0, pageviews: 0 });
});

test('totalsFrom gives zero for what is missing or wrong', () => {
	assert.deepEqual(totalsFrom({ visitors: 71, pageviews: 226 }), { visitors: 71, pageviews: 226 });
	assert.deepEqual(totalsFrom({ visitors: 'x' }), { visitors: 0, pageviews: 0 });
	assert.deepEqual(totalsFrom(null), { visitors: 0, pageviews: 0 });
});

const referrers = [
	{ referrerHostname: '', visitors: 281, pageviews: 1936 },
	{ referrerHostname: 'google.com', visitors: 48, pageviews: 57 },
	{ referrerHostname: 'Others', visitors: 3, pageviews: 3 },
	{ referrerHostname: 'denieuwestermaastricht.nl', visitors: 98, pageviews: 112 },
	{ referrerHostname: 'l.instagram.com', visitors: 8, pageviews: 8 }
];

test('topList sorts, keeps the empty referrer, and puts Vercel\'s Others at the bottom', () => {
	const list = topList(referrers, 'referrerHostname');
	assert.deepEqual(
		list.map((item) => item.key),
		['', 'denieuwestermaastricht.nl', 'google.com', 'l.instagram.com', null]
	);
	assert.deepEqual(list.at(-1), { key: null, other: true, visitors: 3, pageviews: 3 });
});

test('topList adds what falls beyond the limit to the other row', () => {
	const list = topList(referrers, 'referrerHostname', { limit: 2 });
	assert.equal(list.length, 3);
	assert.deepEqual(list[2], { key: null, other: true, visitors: 59, pageviews: 68 });
});

test('topList can sort on pageviews, and leaves out the other row when it is empty', () => {
	const pages = [
		{ requestPath: '/a', visitors: 10, pageviews: 20 },
		{ requestPath: '/b', visitors: 12, pageviews: 15 }
	];
	assert.deepEqual(
		topList(pages, 'requestPath', { sortBy: 'pageviews' }).map((item) => item.key),
		['/a', '/b']
	);
	assert.deepEqual(topList([], 'requestPath'), []);
});

test('shares add up to exactly 100', () => {
	const devices = [
		{ deviceType: 'mobile', visitors: 2 },
		{ deviceType: 'desktop', visitors: 1 },
		{ deviceType: 'tablet', visitors: 0 }
	];
	const result = shares(devices, 'deviceType');
	assert.deepEqual(
		result.map((item) => [item.key, item.percent]),
		[
			['mobile', 67],
			['desktop', 33]
		]
	);
	const three = shares(
		[
			{ deviceType: 'a', visitors: 1 },
			{ deviceType: 'b', visitors: 1 },
			{ deviceType: 'c', visitors: 1 }
		],
		'deviceType'
	);
	assert.equal(three.reduce((sum, item) => sum + item.percent, 0), 100);
	assert.deepEqual(shares([], 'deviceType'), []);
});
