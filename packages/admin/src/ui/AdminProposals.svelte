<script>
	// The open pull requests of F-0018: what the admin proposed and still
	// waits for a merge. Without the GitHub settings it says what is missing.
	import AdminCard from './AdminCard.svelte';
	import AdminMessage from './AdminMessage.svelte';
	import { FORM_TEXT, PROPOSALS_TEXT, fill, joinNames, shortDate, withText } from './text.js';

	/**
	 * @type {{
	 *   data: import('../content-form-server.js').ProposalsData,
	 *   text?: Partial<typeof PROPOSALS_TEXT>
	 * }}
	 */
	let { data, text } = $props();

	const t = $derived(withText(PROPOSALS_TEXT, text));
</script>

<AdminCard title={t.title}>
	{#if data.outcome === 'no-key'}
		<AdminMessage tone="warning" text={fill(t.off, { missing: joinNames(data.missing) })} />
	{:else if data.outcome !== 'ok'}
		<AdminMessage tone="error" text={FORM_TEXT.outcomes[data.outcome] ?? data.outcome} />
	{:else if data.proposals.length === 0}
		<p class="none">{t.none}</p>
	{:else}
		<p class="intro">{t.intro}</p>
		<ul>
			{#each data.proposals as proposal (proposal.number)}
				<li>
					<a href={proposal.url} target="_blank" rel="noopener">{proposal.title}</a>
					<span class="when">{t.updated} {shortDate(proposal.updatedAt)}</span>
				</li>
			{/each}
		</ul>
	{/if}
</AdminCard>

<style>
	.none,
	.intro {
		margin: 0;
		color: var(--ms-muted, #5c5c57);
	}

	ul {
		margin: 0.75rem 0 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.5rem;
	}

	li {
		display: flex;
		flex-direction: column;
		padding: 0.5rem 0;
		border-top: 1px solid var(--ms-border, #dcdcd6);
		overflow-wrap: anywhere;
	}

	li a {
		font-weight: 600;
		min-height: 1.75rem;
	}

	.when {
		font-size: 0.9rem;
		color: var(--ms-muted, #5c5c57);
	}
</style>
