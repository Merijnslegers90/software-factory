<script>
	// A block of content with an optional heading, the building stone of every
	// admin page.

	/**
	 * @type {{
	 *   title?: string,
	 *   level?: 2 | 3,
	 *   children?: import('svelte').Snippet
	 * }}
	 */
	let { title, level = 2, children } = $props();
</script>

<section class="card">
	{#if title}
		<svelte:element this={`h${level}`} class="title">{title}</svelte:element>
	{/if}
	{@render children?.()}
</section>

<style>
	.card {
		background: var(--ms-surface, #fff);
		border: 1px solid var(--ms-border, #dcdcd6);
		border-radius: var(--ms-radius, 0.6rem);
		padding: 1.25rem;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.title {
		margin: 0 0 0.85rem;
		font-size: 1.1rem;
		line-height: 1.3;
	}
</style>
