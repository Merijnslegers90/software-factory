<script>
	// What is waiting (#43): a line per thing, with a count, a text and a
	// link, such as "2 voorstellen wachten op een merge". The product decides
	// what goes in it; proposalsTodo() gives the line for the proposals of
	// F-0018. Empty, it says so.
	import AdminCard from './AdminCard.svelte';
	import { TODO_TEXT, countLabel, withText } from './text.js';

	/**
	 * @type {{
	 *   items?: { count?: number, text: string, href: string }[],
	 *   text?: Partial<typeof TODO_TEXT>
	 * }}
	 */
	let { items = [], text } = $props();

	const t = $derived(withText(TODO_TEXT, text));
</script>

<AdminCard title={t.title}>
	{#if items.length === 0}
		<p class="none">{t.none}</p>
	{:else}
		<ul>
			{#each items as item (item.href + item.text)}
				<li>
					<a href={item.href}>
						{#if countLabel(item.count)}<span class="count">{countLabel(item.count)}</span>{/if}
						<span class="text">{item.text}</span>
						<span class="arrow" aria-hidden="true">→</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</AdminCard>

<style>
	.none {
		margin: 0;
	}

	ul {
		margin: 0 -0.75rem;
		padding: 0;
		list-style: none;
	}

	a {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 2.75rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--ms-radius, 0.6rem);
		color: inherit;
		text-decoration: none;
	}

	a:hover {
		background: color-mix(in srgb, currentColor 8%, transparent);
	}

	.count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		min-width: 1.6rem;
		height: 1.6rem;
		padding: 0 0.4rem;
		border-radius: 999px;
		background: var(--ms-accent, #2f5bd3);
		color: var(--ms-on-accent, #fff);
		font-size: 0.8rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.text {
		flex: 1;
	}

	.arrow {
		color: var(--ms-muted, #5c5c57);
	}
</style>
