<script>
	// One field of the form block, and for a list its items, each with its own
	// fields. Used by AdminContentForm; it calls itself for nested lists.
	import AdminField from './AdminField.svelte';
	import AdminFieldEditor from './AdminFieldEditor.svelte';
	import { emptyItem, toFormValues } from '../content-form.js';

	/**
	 * @type {{
	 *   field: import('../content-form.js').Field,
	 *   value: any,
	 *   path: string,
	 *   errors: Record<string, string>,
	 *   t: typeof import('./text.js').FORM_TEXT
	 * }}
	 */
	let { field, value = $bindable(), path, errors, t } = $props();

	const id = $derived(`f-${path.replace(/[^\w-]/g, '-')}`);
	const error = $derived(errors[path] ? (t.errors[errors[path]] ?? errors[path]) : undefined);

	function add() {
		value = [...value, toFormValues(field.fields, emptyItem(field))];
	}

	function remove(i) {
		value = value.filter((_, n) => n !== i);
	}

	function move(i, by) {
		const next = [...value];
		[next[i], next[i + by]] = [next[i + by], next[i]];
		value = next;
	}

	function itemTitle(item, i) {
		const named = field.titleKey ? item?.[field.titleKey] : '';
		return named || `${field.itemLabel ?? t.item} ${i + 1}`;
	}
</script>

{#if field.type === 'list'}
	<fieldset class="list" aria-describedby={error ? `${id}-error` : undefined}>
		<legend>{field.label}</legend>
		{#if field.hint}<p class="hint">{field.hint}</p>{/if}
		{#if error}<p class="error" id="{id}-error">{error}</p>{/if}
		{#if value.length === 0}<p class="hint">{t.empty}</p>{/if}
		<ol>
			{#each value as item, i (i)}
				<li class="item">
					<div class="item-head">
						<span class="item-title">{itemTitle(item, i)}</span>
						<span class="actions">
							<button
								type="button"
								onclick={() => move(i, -1)}
								disabled={i === 0}
								aria-label="{t.up}: {itemTitle(item, i)}">↑</button
							>
							<button
								type="button"
								onclick={() => move(i, 1)}
								disabled={i === value.length - 1}
								aria-label="{t.down}: {itemTitle(item, i)}">↓</button
							>
							<button type="button" class="remove" onclick={() => remove(i)}
								>{t.remove}<span class="sr">: {itemTitle(item, i)}</span></button
							>
						</span>
					</div>
					{#each field.fields as sub (sub.key)}
						<AdminFieldEditor field={sub} bind:value={item[sub.key]} path="{path}.{i}.{sub.key}" {errors} {t} />
					{/each}
				</li>
			{/each}
		</ol>
		<button type="button" class="add" onclick={add}
			>{t.add}<span class="sr">: {field.itemLabel ?? field.label}</span></button
		>
	</fieldset>
{:else if field.type === 'toggle'}
	<div class="toggle">
		<input type="checkbox" {id} bind:checked={value} />
		<label for={id}>{field.label}</label>
		{#if field.hint}<p class="hint">{field.hint}</p>{/if}
	</div>
{:else}
	<AdminField {id} label={field.label} hint={field.type === 'price' ? (field.hint ?? t.priceHint) : field.hint} {error}>
		{#snippet children({ id, describedby, invalid })}
			{#if field.type === 'longtext'}
				<textarea {id} bind:value aria-describedby={describedby} aria-invalid={invalid} aria-required={field.required || undefined}
				></textarea>
			{:else if field.type === 'price'}
				<span class="price">
					<span aria-hidden="true">€</span>
					<input
						{id}
						type="text"
						inputmode="decimal"
						bind:value
						aria-describedby={describedby}
						aria-invalid={invalid}
						aria-required={field.required || undefined}
					/>
				</span>
			{:else}
				<input
					{id}
					type="text"
					inputmode={field.type === 'link' ? 'url' : undefined}
					maxlength={field.maxLength}
					bind:value
					aria-describedby={describedby}
					aria-invalid={invalid}
					aria-required={field.required || undefined}
				/>
			{/if}
		{/snippet}
	</AdminField>
{/if}

<style>
	.list {
		margin: 0;
		padding: 1rem;
		border: 1px solid var(--ms-border, #dcdcd6);
		border-radius: var(--ms-radius, 0.6rem);
		min-width: 0;
	}

	legend {
		font-weight: 600;
		padding: 0 0.25rem;
	}

	ol {
		margin: 0.5rem 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.75rem;
	}

	.item {
		display: grid;
		gap: 0.75rem;
		padding: 0.85rem;
		border-radius: calc(var(--ms-radius, 0.6rem) * 0.7);
		background: var(--ms-bg, #f6f6f4);
		min-width: 0;
	}

	.item-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.item-title {
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.actions {
		display: flex;
		gap: 0.4rem;
	}

	button {
		min-height: 2.75rem;
		min-width: 2.75rem;
		padding: 0 0.85rem;
		border: 1px solid var(--ms-border, #dcdcd6);
		border-radius: calc(var(--ms-radius, 0.6rem) * 0.7);
		background: var(--ms-surface, #fff);
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.remove {
		color: var(--ms-error, #a3261b);
	}

	.add {
		margin-top: 0.25rem;
	}

	.hint {
		margin: 0;
		font-size: 0.9rem;
		color: var(--ms-muted, #5c5c57);
	}

	.error {
		margin: 0;
		font-weight: 600;
		color: var(--ms-error, #a3261b);
	}

	.toggle {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		min-height: 2.75rem;
	}

	.toggle input {
		width: 1.5rem;
		height: 1.5rem;
		accent-color: var(--ms-accent, #2f5bd3);
	}

	.toggle label {
		font-weight: 600;
	}

	.toggle .hint {
		flex-basis: 100%;
	}

	.price {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.price input {
		max-width: 10rem;
	}

	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
