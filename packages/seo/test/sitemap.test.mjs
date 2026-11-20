import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DISALLOW, robots, sitemap } from '../src/sitemap.js';

const site = { url: 'https://www.example.nl/', name: 'Example' };

test('the sitemap lists every page once, on the fixed domain', () => {
	const xml = sitemap(site, ['/', '/menu', { path: '/menu' }, 'contact?x=1']);
	assert.deepEqual(
		[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]),
		['https://www.example.nl/', 'https://www.example.nl/menu', 'https://www.example.nl/contact']
	);
	assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns=/);
});

test('lastmod is a date, and left out when unknown', () => {
	const xml = sitemap(site, [
		{ path: '/a', lastmod: '2025-09-17T09:01:40.508Z' },
		{ path: '/b', lastmod: new Date('2026-01-03T15:07:55Z') },
		{ path: '/c', lastmod: null }
	]);
	assert.match(xml, /\/a<\/loc>\n {4}<lastmod>2025-09-17<\/lastmod>/);
	assert.match(xml, /\/b<\/loc>\n {4}<lastmod>2026-01-03<\/lastmod>/);
	assert.match(xml, /\/c<\/loc>\n {2}<\/url>/);
});

test('characters in a path are escaped', () => {
	assert.match(sitemap(site, ['/a&b']), /<loc>https:\/\/www\.example\.nl\/a&amp;b<\/loc>/);
});

test('an empty list gives an empty, valid sitemap', () => {
	assert.match(sitemap(site, []), /<urlset[^>]*>\n<\/urlset>/);
});

test('robots.txt keeps admin and API out, adds paths once, and names the sitemap', () => {
	const text = robots(site, { disallow: ['/print', '/admin'] });
	assert.equal(
		text,
		'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\nDisallow: /print\n\nSitemap: https://www.example.nl/sitemap.xml\n'
	);
	assert.deepEqual([...DEFAULT_DISALLOW], ['/admin', '/api']);
});

test('a lastmod that is not a date names the page', () => {
	assert.throws(() => sitemap(site, [{ path: '/menu', lastmod: 'gisteren' }]), /\/menu/);
});
