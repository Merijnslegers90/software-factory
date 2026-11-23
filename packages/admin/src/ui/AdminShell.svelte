<script>
	// The frame of every admin (F-0020): header with the product's logo or
	// name, the menu, a link to the site and logout, and room for one message.
	// The colours live here as CSS variables, so every block inside follows
	// them; a product sets its brand colour with --admin-accent.
	import { page } from '$app/state';
	import AdminMessage from './AdminMessage.svelte';
	import { SHELL_TEXT, isCurrent, withText } from './text.js';
	import { schemeClass, themeStyle } from './theme.js';

	/**
	 * @type {{
	 *   name: string,
	 *   logo?: string,
	 *   nav?: { href: string, label: string }[],
	 *   siteUrl?: string,
	 *   message?: string,
	 *   base?: string,
	 *   theme?: Record<string, any>,
	 *   showSiteLink?: boolean,
	 *   text?: Partial<typeof SHELL_TEXT>,
	 *   children?: import('svelte').Snippet
	 * }}
	 */
	let {
		name,
		logo,
		nav = [],
		siteUrl = '/',
		message,
		base = '/admin',
		theme,
		showSiteLink = true,
		text,
		children
	} = $props();

	const t = $derived(withText(SHELL_TEXT, text));
	const style = $derived(themeStyle(theme));
	const scheme = $derived(schemeClass(theme));
	let open = $state(false);
	const path = $derived(page.url.pathname);
</script>

<div class="ms-admin {scheme}" style={style || undefined}>
	<header class="bar">
		<div class="inner">
			<a class="brand" href={base}>
				{#if logo}
					<img src={logo} alt={name} />
				{:else}
					<span class="name">{name}</span>
				{/if}
				<span class="tag">{t.admin}</span>
			</a>

			<button
				type="button"
				class="toggle"
				aria-expanded={open}
				aria-controls="ms-admin-menu"
				onclick={() => (open = !open)}
			>
				{open ? t.closeMenu : t.menu}
			</button>

			<nav id="ms-admin-menu" class="menu" class:open aria-label={t.menu}>
				<ul>
					{#each nav as item (item.href)}
						<li>
							<a
								href={item.href}
								aria-current={isCurrent(item.href, path, base) ? 'page' : undefined}
								onclick={() => (open = false)}>{item.label}</a
							>
						</li>
					{/each}
					{#if showSiteLink}
						<li>
							<a href={siteUrl} target="_blank" rel="noopener"
								>{t.viewSite} <span aria-hidden="true">↗</span><span class="sr">{t.newWindow}</span></a
							>
						</li>
					{/if}
					<li>
						<!-- A full page load: the 401 there makes the browser forget the password (F-0020). -->
						<a href="{base}/logout" data-sveltekit-reload>{t.logout}</a>
					</li>
				</ul>
			</nav>
		</div>
	</header>

	<main class="inner main">
		{#if message}
			<AdminMessage tone="warning" text={message} />
		{/if}
		{@render children?.()}
	</main>
</div>

<style>
	/* The theme (theme.js): every colour, the fonts and the rounding come from
	   --admin-* variables the product sets, with a calm default for each. The
	   dark version reads --admin-dark-*; scheme 'light' or 'dark' fixes one. */
	.ms-admin {
		--ms-accent: var(--admin-accent, #2f5bd3);
		--ms-on-accent: var(--admin-on-accent, #ffffff);
		--ms-radius: var(--admin-radius, 0.6rem);
		--ms-bg: var(--admin-bg, #f6f6f4);
		--ms-surface: var(--admin-surface, #ffffff);
		--ms-text: var(--admin-text, #1c1c1a);
		--ms-muted: var(--admin-muted, #5c5c57);
		--ms-border: var(--admin-border, #dcdcd6);
		--ms-input-border: var(--admin-input-border, #85857e);
		--ms-warning-bg: var(--admin-warning-bg, #fff4d6);
		--ms-error-bg: var(--admin-error-bg, #fde8e6);
		--ms-ok-bg: var(--admin-ok-bg, #e5f4e8);
		--ms-error: var(--admin-error, #a3261b);
		--ms-font: var(
			--admin-font,
			system-ui,
			-apple-system,
			'Segoe UI',
			Roboto,
			sans-serif
		);
		--ms-heading-font: var(--admin-heading-font, var(--ms-font));
		min-height: 100vh;
		background: var(--ms-bg);
		color: var(--ms-text);
		font-family: var(--ms-font);
		font-size: 1rem;
		line-height: 1.5;
		letter-spacing: normal;
		text-transform: none;
		color-scheme: light;
	}

	@media (prefers-color-scheme: dark) {
		.ms-admin.auto {
			--ms-accent: var(--admin-dark-accent, var(--admin-accent, #2f5bd3));
			--ms-on-accent: var(--admin-dark-on-accent, var(--admin-on-accent, #ffffff));
			--ms-radius: var(--admin-dark-radius, var(--admin-radius, 0.6rem));
			--ms-bg: var(--admin-dark-bg, #151514);
			--ms-surface: var(--admin-dark-surface, #1f1f1d);
			--ms-text: var(--admin-dark-text, #f0f0ec);
			--ms-muted: var(--admin-dark-muted, #b3b3ac);
			--ms-border: var(--admin-dark-border, #3a3a36);
			--ms-input-border: var(--admin-dark-input-border, #8f8f88);
			--ms-warning-bg: var(--admin-dark-warning-bg, #3d3216);
			--ms-error-bg: var(--admin-dark-error-bg, #44201c);
			--ms-ok-bg: var(--admin-dark-ok-bg, #1c3a24);
			--ms-error: var(--admin-dark-error, #ffb3aa);
			color-scheme: dark;
		}
	}

	.ms-admin.dark {
		--ms-accent: var(--admin-dark-accent, var(--admin-accent, #2f5bd3));
		--ms-on-accent: var(--admin-dark-on-accent, var(--admin-on-accent, #ffffff));
		--ms-radius: var(--admin-dark-radius, var(--admin-radius, 0.6rem));
		--ms-bg: var(--admin-dark-bg, #151514);
		--ms-surface: var(--admin-dark-surface, #1f1f1d);
		--ms-text: var(--admin-dark-text, #f0f0ec);
		--ms-muted: var(--admin-dark-muted, #b3b3ac);
		--ms-border: var(--admin-dark-border, #3a3a36);
		--ms-input-border: var(--admin-dark-input-border, #8f8f88);
		--ms-warning-bg: var(--admin-dark-warning-bg, #3d3216);
		--ms-error-bg: var(--admin-dark-error-bg, #44201c);
		--ms-ok-bg: var(--admin-dark-ok-bg, #1c3a24);
		--ms-error: var(--admin-dark-error, #ffb3aa);
		color-scheme: dark;
	}

	/* One focus ring for every block and for what the product puts inside the
	   shell. It follows the text colour, so it stays visible whatever the
	   brand colour is. */
	.ms-admin :global(:focus-visible) {
		outline: 3px solid var(--ms-text);
		outline-offset: 2px;
	}

	.brand,
	.menu a {
		color: inherit;
	}

	/* The product's own styles for headings (a display font, wide letters,
	   capitals) stay out of the admin. */
	.ms-admin :global(:where(h1, h2, h3, h4)) {
		font-family: var(--ms-heading-font);
		letter-spacing: normal;
		text-transform: var(--admin-heading-transform, none);
		line-height: 1.3;
	}

	/* Sizes of their own too: Tailwind's reset makes every heading body size,
	   so a page title in a product without heading sizes looked like text. */
	.ms-admin :global(:where(h1)) {
		margin: 0 0 1rem;
		font-size: 1.75rem;
		font-weight: 700;
	}

	.ms-admin :global(:where(h2)) {
		font-size: 1.25rem;
		font-weight: 700;
	}

	.inner {
		max-width: 62rem;
		margin: 0 auto;
		padding: 0 1.25rem;
	}

	/* The bar can take the product's own colour, so a light logo stays
	   visible: --admin-header-bg and --admin-header-text. */
	.bar {
		background: var(--admin-header-bg, var(--ms-surface));
		color: var(--admin-header-text, var(--ms-text));
		border-bottom: 1px solid var(--ms-border);
	}

	.bar .inner {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding-block: 0.75rem;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		text-decoration: none;
		font-weight: 600;
		min-height: 2.75rem;
		overflow-wrap: anywhere;
	}

	.brand img {
		max-height: 2.5rem;
		width: auto;
	}

	.tag {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--admin-header-text, var(--ms-muted));
	}

	.toggle {
		min-height: 2.75rem;
		padding: 0 1rem;
		border: 1px solid currentColor;
		border-radius: var(--ms-radius);
		background: transparent;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	.menu {
		display: none;
		flex-basis: 100%;
	}

	.menu.open {
		display: block;
	}

	.menu ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.menu a {
		display: flex;
		align-items: center;
		min-height: 2.75rem;
		padding: 0 0.25rem;
		text-decoration: none;
	}

	.menu a:not([aria-current='page']) {
		color: var(--admin-header-text, var(--ms-muted));
	}

	.menu a[aria-current='page'] {
		color: inherit;
	}

	.menu a[aria-current='page'] {
		font-weight: 600;
		text-decoration: underline;
		text-decoration-color: var(--ms-accent);
		text-decoration-thickness: 3px;
		text-underline-offset: 0.4rem;
	}

	@media (min-width: 48rem) {
		.toggle {
			display: none;
		}

		.menu {
			display: block;
			flex-basis: auto;
		}

		.menu ul {
			flex-direction: row;
			flex-wrap: wrap;
			gap: 0 1.25rem;
		}
	}

	.main {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding-block: 2rem 4rem;
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
