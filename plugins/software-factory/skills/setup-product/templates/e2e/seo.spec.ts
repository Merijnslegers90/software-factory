import { test, expect } from '@playwright/test';
import { pagesToCheck } from './pages';
// Where the product keeps its site details for @merijnslegers/seo (F-0019).
// Point this to that file; it must not import anything through $lib or #lib.
import { site } from '../src/lib/content/site';

// What search engines see on every public page (F-0019, skill seo): one
// title, one description, one canonical URL on the fixed domain, lang set,
// and structured data that parses. Then the sitemap and robots.txt.

const origin = new URL(site.url).origin;
const pages = await pagesToCheck();

for (const path of pages) {
	test(`${path} has its title, description and canonical URL`, async ({ page, baseURL }) => {
		await page.goto(path);

		const titles = await page.locator('head title').allTextContents();
		expect(titles, 'one title').toHaveLength(1);
		expect(titles[0].trim(), 'a title that is not empty').not.toBe('');

		const descriptions = page.locator('head meta[name="description"]');
		await expect(descriptions, 'one description').toHaveCount(1);
		expect((await descriptions.getAttribute('content'))?.trim(), 'a description').toBeTruthy();

		const canonical = page.locator('head link[rel="canonical"]');
		await expect(canonical, 'one canonical URL').toHaveCount(1);
		const href = new URL((await canonical.getAttribute('href')) ?? '');
		expect(href.origin, 'the canonical URL is on the fixed domain').toBe(origin);
		expect(href.pathname.replace(/\/$/, '') || '/', 'and on this page').toBe(
			path.replace(/\/$/, '') || '/'
		);

		expect(await page.locator('html').getAttribute('lang'), 'lang on html').toBeTruthy();

		// Only the fixed domain is indexed; a preview or localhost gets noindex.
		const robots = await page.locator('head meta[name="robots"]').getAttribute('content');
		const onSite = new URL(baseURL ?? page.url()).host === new URL(site.url).host;
		expect(robots?.includes('noindex') ?? false, 'noindex everywhere but the domain').toBe(!onSite);

		for (const block of await page
			.locator('script[type="application/ld+json"]')
			.allTextContents()) {
			expect(() => JSON.parse(block), 'structured data that parses').not.toThrow();
		}
	});
}

test('the sitemap lists every page, only on the fixed domain', async ({ request }) => {
	const response = await request.get('/sitemap.xml');
	expect(response.status()).toBe(200);
	const locs = [...(await response.text()).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(
		(m) => new URL(m[1].replace(/&amp;/g, '&'))
	);
	expect(locs.filter((loc) => loc.origin !== origin)).toEqual([]);
	const listed = locs.map((loc) => loc.pathname.replace(/\/$/, '') || '/');
	expect(pages.filter((path) => !listed.includes(path.replace(/\/$/, '') || '/'))).toEqual([]);
});

test('robots.txt names the sitemap on the fixed domain', async ({ request }) => {
	const response = await request.get('/robots.txt');
	expect(response.status()).toBe(200);
	expect(await response.text()).toContain(`Sitemap: ${origin}/sitemap.xml`);
});
