<script>
	// The start page of an admin: a head with the date and a greeting (#43),
	// the site's basic facts, a list of handy links (Vercel, Search Console),
	// and room for summaries such as what is waiting and the visitors. A
	// product without those passes nothing, and nothing is shown.
	import AdminCard from './AdminCard.svelte';
	import { OVERVIEW_TEXT, greeting, longDate, withText } from './text.js';

	/**
	 * @type {{
	 *   facts?: { label: string, value: string, href?: string }[],
	 *   links?: { label: string, href: string, note?: string }[],
	 *   greet?: boolean,
	 *   name?: string,
	 *   now?: Date,
	 *   timeZone?: string,
	 *   text?: Partial<typeof OVERVIEW_TEXT>,
	 *   children?: import('svelte').Snippet
	 * }}
	 */
	let {
		facts = [],
		links = [],
		greet = false,
		name,
		now = new Date(),
		timeZone = 'Europe/Amsterdam',
		text,
		children
	} = $props();

	const t = $derived(withText(OVERVIEW_TEXT, text));
</script>

{#if greet}
	<header class="head">
		<p class="date">{longDate(now, timeZone)}</p>
		<h1>{greeting(now, timeZone, t)}{name ? `, ${name}` : ''}</h1>
	</header>
{/if}

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
	.head h1 {
		margin: 0.25rem 0 0;
	}

	.date {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--ms-muted, #5c5c57);
	}

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
