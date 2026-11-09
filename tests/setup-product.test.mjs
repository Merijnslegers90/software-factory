import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	DIFF_SHARE,
	classify,
	normalisePath,
	pageUrl,
	parsePageList,
	parsePagesModule,
	parseSitemap,
	sitemapChildren,
	renderReport,
	screenshotName
} from '../plugins/software-factory/skills/setup-product/compare/pages.mjs';

// The pure parts of the screenshot comparison in the skill setup-product
// (F-0006). The browser part is tried by hand on two local sites.

test('a page list skips comments and empty lines, and keeps each path once', () => {
	assert.deepEqual(parsePageList('# pages\n/\n\n/over/\n/over\n  /contact?x=1  \n'), [
		'/',
		'/over',
		'/contact?x=1'
	]);
});

test('a sitemap gives its paths, whatever host it names', () => {
	const xml = `<?xml version="1.0"?><urlset>
		<url><loc>https://www.example.nl/</loc></url>
		<url><loc> https://www.example.nl/en/about/ </loc></url>
		<url><loc>https://example.vercel.app/a?b=1&amp;c=2</loc></url>
	</urlset>`;
	assert.deepEqual(parseSitemap(xml), ['/', '/en/about', '/a?b=1&c=2']);
});

test('a sitemap index gives its child sitemaps, and no pages', () => {
	const index = `<sitemapindex><sitemap><loc>https://x.nl/sitemap-pages.xml</loc></sitemap></sitemapindex>`;
	assert.deepEqual(sitemapChildren(index), ['https://x.nl/sitemap-pages.xml']);
	assert.deepEqual(parseSitemap(index), []);
	assert.deepEqual(sitemapChildren('<urlset><url><loc>https://x.nl/</loc></url></urlset>'), []);
});

test('a sitemap skips addresses of other sitemaps', () => {
	const xml =
		'<urlset><url><loc>https://x.nl/</loc></url><url><loc>https://x.nl/more.xml</loc></url></urlset>';
	assert.deepEqual(parseSitemap(xml), ['/']);
});

test('the page list is read from the PAGES list of e2e/pages.ts, without commented lines', () => {
	const source = `export const PAGES: string[] = [
	'/',
	"/contact",
	// '/hidden',
	\`/en/about\`
];
export const OTHER = ['/not-this'];`;
	assert.deepEqual(parsePagesModule(source), ['/', '/contact', '/en/about']);
	assert.deepEqual(parsePagesModule('const x = 1;'), []);
});

test('a path is normalised the same way from a list and from a sitemap', () => {
	assert.equal(normalisePath('over/'), '/over');
	assert.equal(normalisePath('https://x.nl'), '/');
	assert.equal(normalisePath('   '), null);
});

test('a page address keeps the path of the site it is on', () => {
	assert.equal(pageUrl('https://www.example.nl/', '/over'), 'https://www.example.nl/over');
	assert.equal(pageUrl('https://x.vercel.app', '/'), 'https://x.vercel.app/');
});

test('a screenshot name is safe on every file system and names the width', () => {
	assert.match(screenshotName('/', 'phone'), /^home-[a-z0-9]+--phone\.png$/);
	assert.match(
		screenshotName('/en/Over Ons?x=1', 'desktop'),
		/^en-over-ons-x-1-[a-z0-9]+--desktop\.png$/
	);
});

test('two paths that read alike never share a screenshot', () => {
	assert.notEqual(screenshotName('/a-b', 'phone'), screenshotName('/a/b', 'phone'));
	assert.notEqual(screenshotName('/a?x=1', 'phone'), screenshotName('/a?x=2', 'phone'));
	assert.equal(screenshotName('/a/b', 'phone'), screenshotName('/a/b', 'phone'));
});

test('a page differs when its height differs', () => {
	const verdict = classify({
		liveHeight: 900,
		previewHeight: 940,
		width: 1440,
		diffPixels: 0
	});
	assert.equal(verdict.differs, true);
	assert.match(verdict.reason, /height/);
});

test('a page differs only above the share of differing pixels', () => {
	const area = 1440 * 1000;
	const at = Math.floor(area * DIFF_SHARE);
	assert.equal(
		classify({
			liveHeight: 1000,
			previewHeight: 1000,
			width: 1440,
			diffPixels: at
		}).differs,
		false
	);
	assert.equal(
		classify({
			liveHeight: 1000,
			previewHeight: 1000,
			width: 1440,
			diffPixels: at + 1
		}).differs,
		true
	);
});

test('the report lists differences with their image, warns about content, and names what was not compared', () => {
	const report = renderReport({
		live: 'https://www.example.nl',
		preview: 'https://p.vercel.app',
		results: [
			{
				path: '/',
				viewport: 'phone',
				differs: false,
				reason: '',
				diffFile: 'images/diff--home--phone.png'
			},
			{
				path: '/over',
				viewport: 'desktop',
				differs: true,
				reason: '0.50% of the pixels differ',
				diffFile: 'images/diff--over--desktop.png'
			}
		],
		errors: [{ path: '/weg', viewport: 'phone', message: 'gave 404' }]
	});
	assert.match(report, /2 screenshots, 1 differ/);
	assert.match(report, /### \/over \(desktop\)/);
	assert.match(report, /images\/diff--over--desktop\.png/);
	assert.match(report, /edit in the CMS/);
	assert.match(report, /\/weg \(phone\): gave 404/);
	assert.doesNotMatch(report, /\/ \(phone\)\n/);
});

test('a report without differences says so', () => {
	const report = renderReport({ live: 'a', preview: 'b', results: [] });
	assert.match(report, /No differences found/);
});
