import { test, expect } from '@playwright/test';
import { pagesToCheck } from './pages';

// Every public page opens without breaking: a load that fails, a component
// that throws, an {#each} with duplicate keys (skill setup-product). The
// pages come from pages.ts.

// Console errors about external services belong to a run on fake keys and say
// nothing about the page itself. Name the hosts this product calls. A failed
// request to the site's own origin (a script, a stylesheet, an image) is never
// noise: the response listener below reports it.
const EXTERNAL_NOISE = /ERR_NAME_NOT_RESOLVED|Failed to load resource/i;

const pages = await pagesToCheck();

for (const path of pages) {
	test(`${path} opens without errors`, async ({ page }) => {
		const problems: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
		});
		page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
		page.on('response', (response) => {
			const base = process.env.E2E_BASE_URL ?? 'http://localhost:4173';
			const own = new URL(response.url()).origin === new URL(base).origin;
			if (own && response.status() >= 400) {
				problems.push(`${response.status()} on ${response.url()}`);
			}
		});

		const response = await page.goto(path, { waitUntil: 'networkidle' });

		expect(response?.status(), `status of ${path}`).toBeLessThan(400);
		await expect(page).toHaveTitle(/.+/);
		expect(
			problems.filter((p) => !EXTERNAL_NOISE.test(p)),
			`errors in the console on ${path}`
		).toEqual([]);
	});
}
