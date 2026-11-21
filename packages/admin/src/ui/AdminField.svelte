<script>
	// A label, the input the product passes as children, a hint and an error.
	// The input takes `id`, and `aria-describedby` with the ids of hint and
	// error, which the snippet receives.

	/**
	 * @type {{
	 *   id: string,
	 *   label: string,
	 *   hint?: string,
	 *   error?: string,
	 *   children: import('svelte').Snippet<[{ id: string, describedby: string | undefined, invalid: boolean }]>
	 * }}
	 */
	let { id, label, hint, error, children } = $props();

	const describedby = $derived(
		[hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') ||
			undefined
	);
</script>

<div class="field" class:invalid={Boolean(error)}>
	<label for={id}>{label}</label>
	{@render children({ id, describedby, invalid: Boolean(error) })}
	{#if hint}<p class="hint" id="{id}-hint">{hint}</p>{/if}
	{#if error}<p class="error" id="{id}-error">{error}</p>{/if}
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		min-width: 0;
	}

	label {
		font-weight: 600;
	}

	.hint {
		margin: 0;
		font-size: 0.9rem;
		color: var(--ms-muted, #5c5c57);
	}

	.error {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--ms-error, #a3261b);
	}

	.field :global(input:not([type='checkbox'])),
	.field :global(textarea) {
		width: 100%;
		box-sizing: border-box;
		min-height: 2.75rem;
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--ms-input-border, #85857e);
		border-radius: calc(var(--ms-radius, 0.6rem) * 0.7);
		background: var(--ms-bg, #f6f6f4);
		color: inherit;
		font: inherit;
	}

	.field :global(textarea) {
		min-height: 7rem;
		resize: vertical;
	}

	.invalid :global(input),
	.invalid :global(textarea) {
		border-color: var(--ms-error, #a3261b);
		border-width: 2px;
	}
</style>
