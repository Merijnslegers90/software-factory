<script>
	// The Content page of #37: a tab per section the product listed in
	// defineContent, and the form of the active one. The tabs are plain links,
	// so they work without JavaScript; each section saves on its own.
	import AdminContentForm from './AdminContentForm.svelte';
	import { CONTENT_TEXT, FORM_TEXT, withText } from './text.js';

	/**
	 * @type {{
	 *   data: import('../content-form-server.js').ContentData,
	 *   form?: any,
	 *   text?: Partial<typeof CONTENT_TEXT>,
	 *   formText?: Partial<typeof FORM_TEXT>
	 * }}
	 */
	let { data, form = null, text, formText } = $props();

	const t = $derived(withText(CONTENT_TEXT, text));
	const content = $derived(data.content);
</script>

<div class="content">
	{#if content.sections.length > 1}
		<nav class="tabs" aria-label={t.sections}>
			<ul>
				{#each content.sections as section (section.key)}
					<li>
						<a
							href={section.href}
							aria-current={section.key === content.active ? 'page' : undefined}
						>
							{section.label}
							{#if section.proposal}<span class="badge">{t.proposal}</span>{/if}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}

	{#key content.active}
		<AdminContentForm data={content.form} {form} fields={content.fields} text={formText} />
	{/key}
</div>

<style>
	.content {
		display: grid;
		gap: 1.25rem;
		min-width: 0;
	}

	.tabs {
		overflow-x: auto;
		border-bottom: 1px solid var(--ms-border, #dcdcd6);
	}

	.tabs ul {
		display: flex;
		gap: 0.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.tabs a {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 2.75rem;
		padding: 0 1rem;
		border-bottom: 3px solid transparent;
		color: var(--ms-muted, #55554f);
		font-weight: 600;
		text-decoration: none;
		white-space: nowrap;
	}

	.tabs a:hover {
		color: var(--ms-text, #1c1c1a);
	}

	.tabs a[aria-current='page'] {
		border-bottom-color: var(--ms-accent, #2f5bd3);
		color: var(--ms-text, #1c1c1a);
	}

	.badge {
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		background: var(--ms-warning-bg, #fdf3d8);
		color: var(--ms-text, #1c1c1a);
		font-size: 0.8rem;
		font-weight: 500;
	}
</style>
