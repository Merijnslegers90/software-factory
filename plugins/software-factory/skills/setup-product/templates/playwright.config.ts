import { defineConfig } from '@playwright/test';

// The fixed tests (skill setup-product). Without E2E_BASE_URL they run against
// the dev server, started here with the fake values from .env.example; that is
// what CI does. With E2E_BASE_URL they run against that address, such as a
// preview; E2E_FROM_SITEMAP=1 then takes the pages from its sitemap. A preview
// behind Vercel's deployment protection needs E2E_BYPASS_TOKEN, read at run
// time and never stored.

const base = process.env.E2E_BASE_URL;
const bypass = process.env.E2E_BYPASS_TOKEN;

export default defineConfig({
	testDir: './e2e',
	webServer: base
		? undefined
		: {
				command: 'pnpm dev --port 4173',
				url: 'http://localhost:4173',
				reuseExistingServer: true,
				timeout: 120000
			},
	use: {
		baseURL: base ?? 'http://localhost:4173',
		extraHTTPHeaders: bypass
			? { 'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true' }
			: undefined,
		// Where a chromium is already installed (such as a CI image), point to it
		// instead of downloading one.
		launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
			? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
			: undefined
	}
});
