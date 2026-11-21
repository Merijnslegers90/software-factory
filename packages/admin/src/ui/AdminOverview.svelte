<script>
	// The start page of an admin: the site's basic facts, a list of handy
	// links (Vercel, Search Console), and room for summaries such as the
	// visitors. A product without those passes nothing, and nothing is shown.
	import AdminCard from './AdminCard.svelte';
	import { OVERVIEW_TEXT, withText } from './text.js';

	/**
	 * @type {{
	 *   facts?: { label: string, value: string, href?: string }[],
	 *   links?: { label: string, href: string, note?: string }[],
	 *   text?: Partial<typeof OVERVIEW_TEXT>,
	 *   children?: import('svelte').Snippet
	 * }}
	 */
	let { facts = [], links = [], text, children } = $props();

	const t = $derived(withText(OVERVIEW_TEXT, text));
</script>

<div class="overview">
	{@render children?.()}

	{#if facts.length > 0}
		<AdminCard title={t.facts}>
			<dl>
				{#each facts as fact (fact.label)}
					<div>
						<dt>{fact.label}</dt>
						<dd>
							{#if fact.href}<a href={fact.href}>{fact.value}</a>{:else}{fact.value}{/if}
						</dd>
					</div>
				{/each}
			</dl>
		</AdminCard>
	{/if}

	{#if links.length > 0}
		<AdminCard title={t.links}>
			<ul>
				{#each links as link (link.href)}
					<li>
						<a href={link.href} target="_blank" rel="noopener">{link.label}</a>
						{#if link.note}<span class="note">{link.note}</span>{/if}
					</li>
				{/each}
			</ul>
		</AdminCard>
	{/if}
</div>

<style>
	.overview {
		display: grid;
		gap: 1.25rem;
		grid-template-columns: minmax(0, 1fr);
	}

	@media (min-width: 48rem) {
		.overview {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	dl {
		margin: 0;
		display: grid;
		gap: 0.6rem;
	}

	dt {
		font-size: 0.9rem;
		color: var(--ms-muted, #5c5c57);
	}

	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.25rem;
	}

	li a {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
	}

	.note {
		display: block;
		font-size: 0.9rem;
		color: var(--ms-muted, #5c5c57);
	}
</style>
