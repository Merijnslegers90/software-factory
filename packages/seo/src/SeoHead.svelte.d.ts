import type { Component } from 'svelte';
import type { Page, Site } from './head.js';
import type { Node } from './json-ld.js';

declare const SeoHead: Component<{
	site: Site;
	page: Page;
	/** Structured data for this page, such as the business on every page. */
	jsonLd?: Node[];
}>;
export default SeoHead;
