#!/usr/bin/env node
// Compares every page of the live site with the preview, on a phone and a
// desktop width, and writes a report with the pages that differ. Run it from
// the product's repo, where Playwright is installed:
//
//   node <skill>/compare/compare.mjs --live https://www.example.nl \
//     --preview https://example-git-branch.vercel.app --pages e2e/pages.txt
//
// Instead of --pages, --sitemap reads the paths from the live site's
// sitemap.xml. A preview behind Vercel's deployment protection needs a bypass
// token in COMPARE_BYPASS_TOKEN; it is read at run time and never written
// anywhere. The report and the images go to --out (default compare-report).

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
	CHANNEL_TOLERANCE,
	VIEWPORTS,
	classify,
	pageUrl,
	parsePageList,
	parseSitemap,
	renderReport,
	screenshotName
} from './pages.mjs';

function options(argv) {
	const out = { out: 'compare-report' };
	for (let i = 0; i < argv.length; i++) {
		const key = argv[i].replace(/^--/, '');
		if (key === 'sitemap') out.sitemap = true;
		else out[key] = argv[++i];
	}
	if (!out.live || !out.preview || (!out.pages && !out.sitemap)) {
		console.error(
			'Usage: compare.mjs --live <url> --preview <url> (--pages <file> | --sitemap) [--out <dir>]'
		);
		process.exit(2);
	}
	return out;
}

async function pagesToCompare(opts) {
	if (opts.pages) return parsePageList(await readFile(opts.pages, 'utf8'));
	const response = await fetch(pageUrl(opts.live, '/sitemap.xml'));
	if (!response.ok) throw new Error(`sitemap.xml gave ${response.status}`);
	return parseSitemap(await response.text());
}

/** Scrolls the page through, so content that appears on scroll is there, and waits. */
async function settle(page) {
	await page.evaluate(async () => {
		for (let y = 0; y < document.body.scrollHeight; y += 400) {
			window.scrollTo(0, y);
			await new Promise((r) => setTimeout(r, 60));
		}
		window.scrollTo(0, 0);
	});
	await page.waitForTimeout(800);
}

async function screenshot(context, url) {
	const page = await context.newPage();
	try {
		const response = await page.goto(url, {
			waitUntil: 'networkidle',
			timeout: 45000
		});
		if (!response || response.status() >= 400) {
			throw new Error(`${url} gave ${response?.status() ?? 'no response'}`);
		}
		await settle(page);
		return await page.screenshot({ fullPage: true, animations: 'disabled' });
	} finally {
		await page.close();
	}
}

/**
 * Compares two PNGs in the browser, so no image package is needed. Returns the
 * sizes, the number of differing pixels in the common area, and a PNG with the
 * differences in red over a faded copy of the live screenshot.
 */
async function diff(page, livePng, previewPng) {
	return page.evaluate(
		async ({ a, b, tolerance }) => {
			const load = (src) =>
				new Promise((resolve, reject) => {
					const img = new Image();
					img.onload = () => resolve(img);
					img.onerror = reject;
					img.src = src;
				});
			const [imgA, imgB] = await Promise.all([load(a), load(b)]);
			const width = Math.min(imgA.width, imgB.width);
			const height = Math.min(imgA.height, imgB.height);
			const pixels = (img) => {
				const canvas = new OffscreenCanvas(width, height);
				const ctx = canvas.getContext('2d');
				ctx.drawImage(img, 0, 0);
				return ctx.getImageData(0, 0, width, height).data;
			};
			const pa = pixels(imgA);
			const pb = pixels(imgB);
			const out = new OffscreenCanvas(width, height);
			const octx = out.getContext('2d');
			const image = octx.createImageData(width, height);
			let diffPixels = 0;
			for (let i = 0; i < pa.length; i += 4) {
				const different =
					Math.abs(pa[i] - pb[i]) > tolerance ||
					Math.abs(pa[i + 1] - pb[i + 1]) > tolerance ||
					Math.abs(pa[i + 2] - pb[i + 2]) > tolerance;
				if (different) {
					diffPixels++;
					image.data.set([255, 0, 0, 255], i);
				} else {
					const grey = (pa[i] + pa[i + 1] + pa[i + 2]) / 3;
					const faded = 255 - (255 - grey) * 0.25;
					image.data.set([faded, faded, faded, 255], i);
				}
			}
			octx.putImageData(image, 0, 0);
			const blob = await out.convertToBlob({ type: 'image/png' });
			const bytes = new Uint8Array(await blob.arrayBuffer());
			let binary = '';
			for (let i = 0; i < bytes.length; i += 0x8000) {
				binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
			}
			return {
				width,
				liveHeight: imgA.height,
				previewHeight: imgB.height,
				diffPixels,
				diffPng: btoa(binary)
			};
		},
		{
			a: `data:image/png;base64,${livePng.toString('base64')}`,
			b: `data:image/png;base64,${previewPng.toString('base64')}`,
			tolerance: CHANNEL_TOLERANCE
		}
	);
}

/**
 * Playwright from the product's repo, not from next to this script: the skill
 * lives in the plugin's folder, the product has Playwright installed.
 */
async function loadChromium() {
	const require = createRequire(path.join(process.cwd(), 'package.json'));
	for (const name of ['playwright', '@playwright/test']) {
		try {
			const module = await import(pathToFileURL(require.resolve(name)).href);
			return module.chromium ?? module.default.chromium;
		} catch {
			// try the next one
		}
	}
	throw new Error('Playwright is not installed in this repo (pnpm add -D @playwright/test).');
}

async function main() {
	const opts = options(process.argv.slice(2));
	const paths = await pagesToCompare(opts);
	await mkdir(path.join(opts.out, 'images'), { recursive: true });

	const token = process.env.COMPARE_BYPASS_TOKEN;
	const previewHeaders = token
		? {
				'x-vercel-protection-bypass': token,
				'x-vercel-set-bypass-cookie': 'true'
			}
		: {};

	const chromium = await loadChromium();
	const browser = await chromium.launch();
	const results = [];
	const errors = [];
	try {
		const scratch = await (await browser.newContext()).newPage();
		for (const viewport of VIEWPORTS) {
			const size = { width: viewport.width, height: viewport.height };
			const live = await browser.newContext({ viewport: size });
			const preview = await browser.newContext({
				viewport: size,
				extraHTTPHeaders: previewHeaders
			});
			for (const pagePath of paths) {
				try {
					const [a, b] = await Promise.all([
						screenshot(live, pageUrl(opts.live, pagePath)),
						screenshot(preview, pageUrl(opts.preview, pagePath))
					]);
					const d = await diff(scratch, a, b);
					const verdict = classify(d);
					const name = screenshotName(pagePath, viewport.name);
					const diffFile = path.join('images', `diff--${name}`);
					if (verdict.differs) {
						await writeFile(path.join(opts.out, diffFile), Buffer.from(d.diffPng, 'base64'));
						await writeFile(path.join(opts.out, 'images', `live--${name}`), a);
						await writeFile(path.join(opts.out, 'images', `preview--${name}`), b);
					}
					results.push({
						path: pagePath,
						viewport: viewport.name,
						...verdict,
						diffFile
					});
					console.log(
						`${verdict.differs ? 'DIFFERS' : 'same   '}  ${viewport.name.padEnd(7)} ${pagePath}`
					);
				} catch (error) {
					errors.push({
						path: pagePath,
						viewport: viewport.name,
						message: error.message
					});
					console.log(`ERROR    ${viewport.name.padEnd(7)} ${pagePath}: ${error.message}`);
				}
			}
			await live.close();
			await preview.close();
		}
	} finally {
		await browser.close();
	}

	const report = renderReport({
		live: opts.live,
		preview: opts.preview,
		results,
		errors
	});
	await writeFile(path.join(opts.out, 'report.md'), report);
	console.log(`\nReport: ${path.join(opts.out, 'report.md')}`);
	process.exit(results.some((r) => r.differs) || errors.length > 0 ? 1 : 0);
}

main().catch((error) => {
	console.error(error);
	process.exit(2);
});
