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
	test(`${path} has its title, description and canonical URL`, async ({ page }) => {
		const response = await page.goto(path);
		// Read every tag at once: a tag that is missing is a finding, not a wait.
		const tags = await page.evaluate(() => ({
			descriptions: [...document.head.querySelectorAll('meta[name="description"]')].map(
				(m) => m.getAttribute('content') ?? ''
			),
			canonicals: [...document.head.querySelectorAll('link[rel="canonical"]')].map(
				(l) => l.getAttribute('href') ?? ''
			),
			robots: [...document.head.querySelectorAll('meta[name="robots"]')].map(
				(m) => m.getAttribute('content') ?? ''
			),
			lang: document.documentElement.getAttribute('lang')
		}));

		const titles = await page.locator('head title').allTextContents();
		expect(titles, 'one title').toHaveLength(1);
		expect(titles[0].trim(), 'a title that is not empty').not.toBe('');

		expect(tags.descriptions, 'one description').toHaveLength(1);
		expect(tags.descriptions[0].trim(), 'a description that is not empty').not.toBe('');

		expect(tags.canonicals, 'one canonical URL').toHaveLength(1);
		const href = new URL(tags.canonicals[0]);
		expect(href.origin, 'the canonical URL is on the fixed domain').toBe(origin);
		expect(href.pathname.replace(/\/$/, '') || '/', 'and on this page').toBe(
			path.replace(/\/$/, '') || '/'
		);

		expect(tags.lang, 'lang on html').toBeTruthy();

		// Only the fixed domain is indexed. The host is where the browser ended
		// up, after a redirect from the bare domain to www. Elsewhere the page
		// says noindex itself, or, when it was prerendered as on the domain, the
		// host does: Vercel sends X-Robots-Tag: noindex on previews.
		const onSite = new URL(page.url()).host === new URL(site.url).host;
		const inPage = tags.robots.some((content) => content.includes('noindex'));
		const inHeader = (response?.headers()['x-robots-tag'] ?? '').includes('noindex');
		if (onSite) expect(inPage || inHeader, 'no noindex on the fixed domain').toBe(false);
		else expect(inPage || inHeader, 'noindex everywhere but the fixed domain').toBe(true);

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
