<script>
	// The visitors of this month for the overview of an admin (F-0020), with a
	// link to the full block. Without the settings it is left out entirely:
	// an overview shows no errors for what a product does not use.
	import { VISITORS_TEXT } from './text.js';
	import { changeText, number, withText } from './shared.js';

	/**
	 * @type {{
	 *   data: import('../visitors.js').VisitorsSummaryData,
	 *   href?: string,
	 *   text?: Partial<typeof VISITORS_TEXT>
	 * }}
	 */
	let { data, href = '/admin/bezoekers', text } = $props();

	const t = $derived(withText(VISITORS_TEXT, text));
</script>

{#if data.enabled}
	<section class="summary" aria-labelledby="ms-visitors-summary">
		<h2 id="ms-visitors-summary">{t.title}: {t.thisMonth.toLowerCase()}</h2>
		{#if data.totals}
			<div class="numbers">
				{#each [['visitors', t.visitors], ['pageviews', t.pageviews]] as [key, label] (key)}
					{@const delta = changeText(data.change?.[key], t.new)}
					<div>
						<span class="label">{label}</span>
						<span class="value">{number(data.totals[key])}</span>
						{#if delta}<span class="change">{delta.text}</span>{/if}
					</div>
				{/each}
			</div>
			<p class="since">{t.sinceLastMonth}</p>
		{:else}
			<p class="since">{t.reasons[data.reason] ?? data.reason}</p>
		{/if}
		<a {href}>{t.more}</a>
	</section>
{/if}

<style>
	.summary {
		display: grid;
		gap: 0.6rem;
		padding: 1.25rem;
		border: 1px solid var(--ms-border, #dcdcd6);
		border-radius: var(--ms-radius, 0.6rem);
		background: var(--ms-surface, #fff);
		min-width: 0;
	}

	h2 {
		margin: 0;
		font-size: 1.1rem;
	}

	.numbers {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
	}

	.numbers div {
		display: grid;
	}

	.label,
	.since {
		margin: 0;
		font-size: 0.9rem;
		color: var(--ms-muted, #5c5c57);
	}

	.value {
		font-size: 1.75rem;
		font-weight: 700;
		line-height: 1.1;
	}

	.change {
		font-weight: 600;
	}

	a {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
	}
</style>
