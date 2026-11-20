<script>
	// The visitor numbers of F-0015 as one block (F-0020): totals with the
	// change, a series per day or week, the top pages and where visitors come
	// from, and a choice of period. The data comes from loadVisitors.
	import { VISITORS_TEXT } from './text.js';
	import { barWidth, changeText, fill, number, seriesLabel, withText } from './shared.js';

	/**
	 * @type {{
	 *   data: import('../visitors.js').VisitorsData,
	 *   text?: Partial<typeof VISITORS_TEXT>
	 * }}
	 */
	let { data, text } = $props();

	const t = $derived(withText(VISITORS_TEXT, text));
	const maxSeries = $derived(Math.max(0, ...data.series.map((p) => p.visitors)));
	const maxPage = $derived(Math.max(0, ...data.pages.map((p) => p.pageviews)));
	const maxReferrer = $derived(Math.max(0, ...data.referrers.map((p) => p.visitors)));
</script>

<section class="visitors" aria-labelledby="ms-visitors-title">
	<div class="head">
		<h2 id="ms-visitors-title">{t.title}</h2>
		<nav aria-label={t.period}>
			<ul class="periods">
				{#each data.periods as days (days)}
					<li>
						<a
							href="?{data.param}={days}"
							aria-current={days === data.days ? 'true' : undefined}
							data-sveltekit-noscroll>{fill(t.days, { n: days })}</a
						>
					</li>
				{/each}
			</ul>
		</nav>
	</div>

	{#if data.reason}
		<p class="message" role="status">{t.reasons[data.reason] ?? data.reason}</p>
	{:else if data.totals}
		<div class="totals">
			{#each [['visitors', t.visitors], ['pageviews', t.pageviews]] as [key, label] (key)}
				{@const delta = changeText(data.change?.[key], t.new)}
				<div class="total">
					<span class="label">{label}</span>
					<span class="value">{number(data.totals[key])}</span>
					{#if delta}
						<span class="change {delta.direction}">{delta.text} <span class="since">{t.sincePrevious}</span></span>
					{/if}
				</div>
			{/each}
		</div>

		{#if data.totals.visitors === 0}
			<p class="message">{t.none}</p>
		{:else}
			<div class="block">
				<h3>{data.granularity === 'week' ? t.seriesWeek : t.series}</h3>
				<div class="chart" aria-hidden="true">
					{#each data.series as point (point.start)}
						<span class="bar" style="height: {barWidth(point.visitors, maxSeries)}%" title="{seriesLabel(point.start)}: {point.visitors}"></span>
					{/each}
				</div>
				<details>
					<summary>{t.showTable}</summary>
					<table>
						<thead><tr><th scope="col">{t.date}</th><th scope="col">{t.visitors}</th><th scope="col">{t.pageviews}</th></tr></thead>
						<tbody>
							{#each data.series as point (point.start)}
								<tr><td>{seriesLabel(point.start)}</td><td>{number(point.visitors)}</td><td>{number(point.pageviews)}</td></tr>
							{/each}
						</tbody>
					</table>
				</details>
			</div>

			<div class="lists">
				<div class="block">
					<h3>{t.pages}</h3>
					<ol class="top">
						{#each data.pages as item (item.key ?? 'other')}
							<li>
								<span class="row"><span class="key">{item.other ? t.other : item.key}</span><span class="n">{number(item.pageviews)}</span></span>
								<span class="track" aria-hidden="true"><span style="width: {barWidth(item.pageviews, maxPage)}%"></span></span>
							</li>
						{/each}
					</ol>
				</div>
				<div class="block">
					<h3>{t.referrers}</h3>
					<ol class="top">
						{#each data.referrers as item (item.key ?? 'other')}
							<li>
								<span class="row"><span class="key">{item.other ? t.other : (item.key || t.direct)}</span><span class="n">{number(item.visitors)}</span></span>
								<span class="track" aria-hidden="true"><span style="width: {barWidth(item.visitors, maxReferrer)}%"></span></span>
							</li>
						{/each}
					</ol>
				</div>
			</div>
		{/if}
	{/if}
</section>

<style>
	.visitors {
		display: grid;
		gap: 1.25rem;
		min-width: 0;
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	h2 {
		margin: 0;
		font-size: 1.4rem;
	}

	h3 {
		margin: 0 0 0.75rem;
		font-size: 1.05rem;
	}

	.periods {
		display: flex;
		gap: 0.4rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.periods a {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		padding: 0 0.85rem;
		border: 1px solid var(--ms-border, #dcdcd6);
		border-radius: 999px;
		text-decoration: none;
	}

	.periods a[aria-current='true'] {
		background: var(--ms-accent, #2f5bd3);
		border-color: var(--ms-accent, #2f5bd3);
		color: var(--ms-on-accent, #fff);
	}

	.message {
		margin: 0;
		padding: 0.85rem 1rem;
		border-radius: var(--ms-radius, 0.6rem);
		background: var(--ms-warning-bg, #fff4d6);
	}

	.totals {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
	}

	.total,
	.block {
		display: grid;
		gap: 0.25rem;
		padding: 1.25rem;
		border: 1px solid var(--ms-border, #dcdcd6);
		border-radius: var(--ms-radius, 0.6rem);
		background: var(--ms-surface, #fff);
		min-width: 0;
	}

	.label,
	.since {
		color: var(--ms-muted, #5c5c57);
		font-size: 0.9rem;
	}

	.value {
		font-size: 2rem;
		font-weight: 700;
		line-height: 1.1;
	}

	.change {
		font-weight: 600;
	}

	.chart {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		height: 8rem;
	}

	.bar {
		flex: 1;
		min-width: 2px;
		background: var(--ms-accent, #2f5bd3);
		border-radius: 2px 2px 0 0;
	}

	details {
		margin-top: 0.5rem;
	}

	summary {
		min-height: 2.75rem;
		display: flex;
		align-items: center;
		cursor: pointer;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.95rem;
	}

	th,
	td {
		text-align: left;
		padding: 0.35rem 0.25rem;
		border-bottom: 1px solid var(--ms-border, #dcdcd6);
	}

	.lists {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
	}

	.top {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.6rem;
	}

	.row {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.key {
		overflow-wrap: anywhere;
	}

	.n {
		font-variant-numeric: tabular-nums;
	}

	.track {
		display: block;
		height: 0.35rem;
		margin-top: 0.2rem;
		border-radius: 999px;
		background: var(--ms-bg, #f6f6f4);
	}

	.track span {
		display: block;
		height: 100%;
		border-radius: 999px;
		background: var(--ms-accent, #2f5bd3);
	}
</style>
