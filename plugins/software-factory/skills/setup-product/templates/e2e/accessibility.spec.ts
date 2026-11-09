import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { pagesToCheck } from './pages';
import { KNOWN_ISSUES } from './known-issues';

// Every public page through axe, against WCAG 2.2 level AA, on a phone and a
// desktop width (skill setup-product). It catches what quietly breaks with a
// new colour or icon: too little contrast, a link or button without a name, a
// field without a label, a touch target under 24 pixels. Keyboard and screen
// reader are still checked by hand.
//
// Issues that were there when the site was taken in are in known-issues.ts,
// excluded one by one, so nothing new can be added.

const VIEWPORTS = [
	{ name: 'phone', width: 390, height: 844 },
	{ name: 'desktop', width: 1440, height: 900 }
];

// Some content appears only on scroll and is transparent until then. axe
// skips invisible text, so the page is scrolled through first.
async function scrollThrough(page: Page) {
	await page.evaluate(async () => {
		for (let y = 0; y < document.body.scrollHeight; y += 400) {
			window.scrollTo(0, y);
			await new Promise((r) => setTimeout(r, 60));
		}
		window.scrollTo(0, 0);
	});
	await page.waitForTimeout(800);
}

function isKnown(path: string, rule: string) {
	return KNOWN_ISSUES.some((issue) => issue.page === path && issue.rule === rule);
}

const pages = await pagesToCheck();

for (const viewport of VIEWPORTS) {
	for (const path of pages) {
		test(`${path} meets WCAG AA on a ${viewport.name}`, async ({ page }) => {
			await page.setViewportSize({ width: viewport.width, height: viewport.height });
			await page.goto(path, { waitUntil: 'networkidle' });
			await scrollThrough(page);
			const result = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
				.analyze();
			const found = result.violations
				.filter((v) => !isKnown(path, v.id))
				.map((v) => ({ rule: v.id, help: v.help, where: v.nodes.map((n) => n.target.join(' ')) }));
			expect(found).toEqual([]);
		});
	}
}
