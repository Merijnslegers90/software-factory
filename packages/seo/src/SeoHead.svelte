<script>
	// The head of a public page (F-0019), for the root layout of a product:
	//
	//   <SeoHead {site} page={{ title, description }} jsonLd={[...]} />
	//
	// The canonical URL and the share tags are always on site.url; on any
	// other host the page gets noindex, except a page that was prerendered: that
	// is written once, as on the fixed domain. The logic is in head.js and json-ld.js.
	import { building } from '$app/environment';
	import { page as current } from '$app/state';
	import { headTags } from './head.js';
	import { jsonLd as jsonLdTag } from './json-ld.js';

	/** @type {{ site: import('./head.js').Site, page: import('./head.js').Page, jsonLd?: import('./json-ld.js').Node[] }} */
	let { site, page, jsonLd = [] } = $props();

	// While prerendering the request has no real host: write the page as it
	// will be served on the fixed domain, so it is not marked noindex there.
	const tags = $derived(headTags(site, page, current.url, { prerendering: building }));
	const data = $derived(jsonLd.length > 0 ? jsonLdTag(...jsonLd) : '');
</script>

<!-- Both strings are built and escaped by head.js and json-ld.js. -->
<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html tags}
	{#if data}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html data}
	{/if}
</svelte:head>
