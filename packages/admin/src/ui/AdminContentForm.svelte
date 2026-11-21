<script>
	// The form block of F-0020: the fields a product describes, filled from its
	// JSON file (or from the open proposal), saved as a proposal (F-0018). The
	// whole value goes along as JSON in one field; the server checks it again.
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { beforeNavigate } from '$app/navigation';
	import AdminFieldEditor from './AdminFieldEditor.svelte';
	import AdminMessage from './AdminMessage.svelte';
	import { toFormValues } from '../content-form.js';
	import { FORM_TEXT, fill, joinNames, withText } from './text.js';

	/**
	 * @type {{
	 *   data: import('../content-form-server.js').ContentFormData,
	 *   form?: any,
	 *   fields: import('../content-form.js').Field[],
	 *   action?: string,
	 *   text?: Partial<typeof FORM_TEXT>
	 * }}
	 */
	let { data, form = null, fields, action = '', text } = $props();

	const t = $derived(withText(FORM_TEXT, text));
	// The form keeps its own copy, so a failed save keeps what was typed. It
	// starts from the data once; after a save it is set again below.
	let value = $state(untrack(() => toFormValues(fields, data.values)));
	let saved = $state(untrack(() => JSON.stringify(value)));
	let saving = $state(false);

	// Leaving with changes that are not saved asks first (#37), also when
	// switching to another tab of the Content page.
	const dirty = $derived(data.canSave && JSON.stringify(value) !== saved);
	beforeNavigate((navigation) => {
		if (!dirty || saving) return;
		if (navigation.type === 'leave') {
			navigation.cancel();
			return;
		}
		if (!confirm(t.leave)) navigation.cancel();
	});

	const errors = $derived(form?.errors ?? {});
	const outcome = $derived(!data.canSave ? data.outcome : (form?.outcome ?? null));
	const outcomeText = $derived(
		outcome
			? fill(t.outcomes[outcome] ?? outcome, {
					missing: joinNames(data.missing),
					at: data.mismatchAt ?? ''
				})
			: ''
	);
	const proposal = $derived(form?.proposal ?? data.proposal);

	/** @type {import('@sveltejs/kit').SubmitFunction} */
	function submit() {
		saving = true;
		return async ({ update, result }) => {
			saving = false;
			// After a save, start from the saved version; after an error, keep the input.
			await update({ reset: false, invalidateAll: result.type === 'success' });
			if (result.type === 'success') {
				value = toFormValues(fields, data.values);
				saved = JSON.stringify(value);
			}
		};
	}
</script>

<form method="POST" {action} use:enhance={submit} class="content-form" novalidate>
	{#if form?.ok}
		<AdminMessage tone="ok">
			<p>{form.changed ? t.saved : t.unchanged}</p>
			{#if proposal}<p><a href={proposal.url} target="_blank" rel="noopener">{t.viewProposal}</a></p>{/if}
		</AdminMessage>
	{:else if form?.errors}
		<AdminMessage tone="error" text={t.fixErrors} />
	{:else if outcome && outcome !== 'ok'}
		<AdminMessage tone={outcome === 'no-key' ? 'warning' : 'error'} text={outcomeText} />
	{/if}

	{#if data.proposal && !form?.ok}
		<AdminMessage tone="info">
			<p>{t.openProposal}</p>
			<p><a href={data.proposal.url} target="_blank" rel="noopener">{t.viewProposal}</a></p>
		</AdminMessage>
	{/if}

	{#if errors['']}
		<AdminMessage tone="error" text={t.errors[errors['']] ?? t.errors['not-readable']} />
	{/if}

	<fieldset class="fields" disabled={!data.canSave || saving}>
		{#each fields as field (field.key)}
			<AdminFieldEditor {field} bind:value={value[field.key]} path={field.key} {errors} {t} />
		{/each}
	</fieldset>

	<input type="hidden" name="value" value={JSON.stringify(value)} />

	<div class="submit">
		<button type="submit" disabled={!data.canSave || saving}>{saving ? t.saving : t.save}</button>
	</div>
</form>

<style>
	.content-form {
		display: grid;
		gap: 1.25rem;
		min-width: 0;
	}

	.fields {
		margin: 0;
		padding: 0;
		border: 0;
		display: grid;
		gap: 1.25rem;
		min-width: 0;
	}

	.submit {
		position: sticky;
		bottom: 0;
		padding: 0.75rem 0;
		background: var(--ms-bg, #f6f6f4);
	}

	.submit button {
		min-height: 3rem;
		padding: 0 1.5rem;
		border: 0;
		border-radius: var(--ms-radius, 0.6rem);
		background: var(--ms-accent, #2f5bd3);
		color: var(--ms-on-accent, #fff);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.submit button:disabled {
		opacity: 0.55;
		cursor: default;
	}
</style>
