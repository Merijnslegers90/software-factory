<script>
	// One message in the admin: information, a warning, an error or a success.
	// An error is read out at once by a screen reader; the rest when it is calm.

	/**
	 * @type {{
	 *   tone?: 'info' | 'warning' | 'error' | 'ok',
	 *   text?: string,
	 *   children?: import('svelte').Snippet
	 * }}
	 */
	let { tone = 'info', text, children } = $props();
</script>

<div class="message {tone}" role={tone === 'error' ? 'alert' : 'status'}>
	{#if text}<p>{text}</p>{/if}
	{@render children?.()}
</div>

<style>
	.message {
		padding: 0.85rem 1rem;
		border: 1px solid var(--ms-border, #dcdcd6);
		border-left-width: 4px;
		border-radius: var(--ms-radius, 0.6rem);
		background: var(--ms-surface, #fff);
		overflow-wrap: anywhere;
	}

	.message :global(p) {
		margin: 0;
	}

	.message :global(p + p) {
		margin-top: 0.4rem;
	}

	.info {
		border-left-color: var(--ms-accent, #2f5bd3);
	}

	.warning {
		background: var(--ms-warning-bg, #fff4d6);
		border-left-color: #b7791f;
	}

	.error {
		background: var(--ms-error-bg, #fde8e6);
		border-left-color: var(--ms-error, #a3261b);
	}

	.ok {
		background: var(--ms-ok-bg, #e5f4e8);
		border-left-color: #2f7d3e;
	}
</style>
