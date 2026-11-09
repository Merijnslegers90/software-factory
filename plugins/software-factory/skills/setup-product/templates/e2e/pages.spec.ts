import { test, expect } from '@playwright/test';
import { pagesToCheck } from './pages';

// Every public page opens without breaking: a load that fails, a component
// that throws, an {#each} with duplicate keys (skill setup-product). The
// pages come from pages.ts.

// Network errors to external services belong to a run on fake keys and say
// nothing about the page itself. Name the services this product calls.
const EXTERNAL_NOISE = /ERR_NAME_NOT_RESOLVED|Failed to load resource/i;

const pages = await pagesToCheck();

for (const path of pages) {
	test(`${path} opens without errors`, async ({ page }) => {
		const problems: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
		});
		page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));

		const response = await page.goto(path, { waitUntil: 'networkidle' });

		expect(response?.status(), `status of ${path}`).toBeLessThan(400);
		await expect(page).toHaveTitle(/.+/);
		expect(
			problems.filter((p) => !EXTERNAL_NOISE.test(p)),
			`errors in the console on ${path}`
		).toEqual([]);
	});
}
