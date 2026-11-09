// The pure parts of the screenshot comparison (F-0006): which pages, where a
// screenshot goes, when two screenshots differ, and the report. No browser
// and no network here, so it is tested in tests/setup-product.test.mjs.

/** The two widths every page is compared at. */
export const VIEWPORTS = [
	{ name: 'phone', width: 390, height: 844 },
	{ name: 'desktop', width: 1440, height: 900 }
];

/**
 * A channel that differs by more than this counts as a different pixel. Low
 * enough to catch a changed colour, high enough to ignore font smoothing.
 */
export const CHANNEL_TOLERANCE = 32;

/** A page differs when more than this share of its pixels differs. */
export const DIFF_SHARE = 0.001;

/** A path as we compare it: starting with a slash, without a trailing one. */
export function normalisePath(path) {
	const trimmed = String(path ?? '').trim();
	if (!trimmed) return null;
	let url;
	try {
		url = new URL(trimmed, 'https://compare.invalid');
	} catch {
		return null;
	}
	const pathname = url.pathname.replace(/\/+$/, '') || '/';
	return pathname + url.search;
}

/** Unique, normalised paths in their first order. */
function unique(paths) {
	return [...new Set(paths.map(normalisePath).filter(Boolean))];
}

/** A page list: one path per line; empty lines and lines starting with # are skipped. */
export function parsePageList(text) {
	return unique(
		String(text ?? '')
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line && !line.startsWith('#'))
	);
}

/** The paths in a sitemap.xml, whatever host it names. */
export function parseSitemap(xml) {
	const locs = [...String(xml ?? '').matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) =>
		m[1].replace(/&amp;/g, '&')
	);
	return unique(locs);
}

/** The full address of a path on a site. */
export function pageUrl(base, path) {
	return new URL(path, String(base).replace(/\/+$/, '') + '/').toString();
}

/** A file name for one page at one width, safe on every file system. */
export function screenshotName(path, viewport) {
	const slug =
		path === '/'
			? 'home'
			: path
					.replace(/^\//, '')
					.replace(/[^a-zA-Z0-9]+/g, '-')
					.replace(/^-|-$/g, '')
					.toLowerCase();
	return `${slug || 'home'}--${viewport}.png`;
}

/**
 * Whether two screenshots of one page differ.
 * `diffPixels` counts the differing pixels in the area both have in common.
 */
export function classify({ liveHeight, previewHeight, width, diffPixels }) {
	if (liveHeight !== previewHeight) {
		return {
			differs: true,
			reason: `height ${liveHeight}px live, ${previewHeight}px preview`
		};
	}
	const share = diffPixels / Math.max(1, width * liveHeight);
	if (share > DIFF_SHARE) {
		return {
			differs: true,
			reason: `${(share * 100).toFixed(2)}% of the pixels differ`
		};
	}
	return { differs: false, reason: '' };
}

/** The report, as Markdown: the pages that differ first, with their images. */
export function renderReport({ live, preview, results, errors = [] }) {
	const differing = results.filter((r) => r.differs);
	const lines = [
		'# Screenshot comparison',
		'',
		`- Live: ${live}`,
		`- Preview: ${preview}`,
		`- Compared: ${results.length} screenshots, ${differing.length} differ`,
		''
	];
	if (differing.length === 0 && errors.length === 0) {
		lines.push('No differences found.');
	}
	if (differing.length > 0) {
		lines.push(
			'## Differences',
			'',
			'A difference can also be content that changed on the live site in between, such as an edit in the CMS. Judge each one.',
			''
		);
		for (const r of differing) {
			lines.push(
				`### ${r.path} (${r.viewport})`,
				'',
				r.reason,
				'',
				`![difference](${r.diffFile})`,
				''
			);
		}
	}
	if (errors.length > 0) {
		lines.push('## Not compared', '');
		for (const e of errors) lines.push(`- ${e.path} (${e.viewport}): ${e.message}`);
		lines.push('');
	}
	return lines.join('\n');
}
