<script>
	// The frame of every admin (F-0020, #43): a sidebar from laptop width with
	// the logo, the menu in groups and, at the bottom, the site, who is logged
	// in and logout; on a phone a bar with a menu that folds out. The colours
	// live here as CSS variables, so every block inside follows them.
	import { page } from '$app/state';
	import AdminMessage from './AdminMessage.svelte';
	import {
		SHELL_TEXT,
		countLabel,
		isCurrent,
		navGroups,
		titleWithCount,
		totalCount,
		withText
	} from './text.js';
	import { schemeClass, themeStyle } from './theme.js';

	/**
	 * @type {{
	 *   name: string,
	 *   logo?: string,
	 *   nav?: ({ href: string, label: string, count?: number } | { title?: string, items: { href: string, label: string, count?: number }[] })[],
	 *   siteUrl?: string,
	 *   message?: string,
	 *   base?: string,
	 *   theme?: Record<string, any>,
	 *   showSiteLink?: boolean,
	 *   user?: string,
	 *   title?: string,
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
		user,
		title,
		text,
		children
	} = $props();

	const t = $derived(withText(SHELL_TEXT, text));
	const style = $derived(themeStyle(theme));
	const scheme = $derived(schemeClass(theme));
	const path = $derived(page.url.pathname);
	const groups = $derived(navGroups(nav));
	const total = $derived(totalCount(groups));
	const tabTitle = $derived(titleWithCount(title ?? `Admin ${name}`, total));
	let menu = $state();

	// A link in the folded-out menu closes it again.
	function close() {
		if (menu) menu.open = false;
	}
</script>

<svelte:head>
	<title>{tabTitle}</title>
</svelte:head>

{#snippet badge(count)}
	{#if countLabel(count)}
		<span class="badge">{countLabel(count)}<span class="sr"> {t.open}</span></span>
	{/if}
{/snippet}

{#snippet brand()}
	<a class="brand" href={base}>
		{#if logo}
			<img src={logo} alt={name} />
		{:else}
			<span class="name">{name}</span>
		{/if}
		<span class="tag">{t.admin}</span>
	</a>
{/snippet}

{#snippet menuList()}
	{#each groups as group, index (group.title ?? index)}
		<div class="group">
			{#if group.title && groups.length > 1}<p class="group-title">{group.title}</p>{/if}
			<ul>
				{#each group.items as item (item.href)}
					<li>
						<a
							href={item.href}
							aria-current={isCurrent(item.href, path, base) ? 'page' : undefined}
							onclick={close}
						>
							<span class="label">{item.label}</span>
							{@render badge(item.count)}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
{/snippet}

{#snippet bottom()}
	<div class="bottom">
		{#if showSiteLink}
			<a href={siteUrl} target="_blank" rel="noopener"
				>{t.viewSite} <span aria-hidden="true">↗</span><span class="sr">{t.newWindow}</span></a
			>
		{/if}
		{#if user}
			<p class="user"><span class="sr">{t.loggedIn} </span>{user}</p>
		{/if}
		<!-- A full page load: the 401 there makes the browser forget the password (F-0020). -->
		<a href="{base}/logout" data-sveltekit-reload>{t.logout}</a>
	</div>
{/snippet}

<div class="ms-admin {scheme}" style={style || undefined}>
	<aside class="side">
		{@render brand()}
		<nav class="menu" aria-label={t.menu}>
			{@render menuList()}
		</nav>
		{@render bottom()}
	</aside>

	<!-- On a phone: a bar with the menu in a <details>, so it opens without
	     JavaScript as well. The total of what is open shows on the button. -->
	<header class="bar">
		{@render brand()}
		<details class="fold" bind:this={menu}>
			<summary>
				{t.menu}
				{@render badge(total)}
			</summary>
			<div class="panel">
				<nav class="menu" aria-label={t.menu}>
					{@render menuList()}
				</nav>
				{@render bottom()}
			</div>
		</details>
	</header>

	<main class="main">
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

	.brand {
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

	/* The bar on a phone and the sidebar from laptop width can take the
	   product's own colour, so a light logo stays visible: --admin-header-bg
	   and --admin-header-text. */
	.side,
	.bar {
		background: var(--admin-header-bg, var(--ms-surface));
		color: var(--admin-header-text, var(--ms-text));
	}

	.side {
		display: none;
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem 1.25rem;
		border-bottom: 1px solid var(--ms-border);
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
		max-width: 10rem;
		width: auto;
	}

	.tag {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--admin-header-text, var(--ms-muted));
	}

	.bar {
		position: relative;
	}

	.fold summary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 2.75rem;
		padding: 0 1rem;
		border: 1px solid currentColor;
		border-radius: var(--ms-radius);
		cursor: pointer;
		list-style: none;
	}

	.fold summary::-webkit-details-marker {
		display: none;
	}

	/* The folded-out menu lies over the page, the full width of the bar. */
	.panel {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-height: calc(100vh - 4.5rem);
		overflow-y: auto;
		padding: 1rem 1.25rem 1.25rem;
		background: var(--admin-header-bg, var(--ms-surface));
		border-bottom: 1px solid var(--ms-border);
		box-shadow: 0 0.5rem 1rem rgb(0 0 0 / 0.15);
	}

	/* The menu: small text in the heading font with wide letters, a line in
	   the accent colour beside the page you are on. */
	.menu {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.group-title {
		margin: 0 0 0.25rem;
		padding: 0 0.75rem;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--admin-header-text, var(--ms-muted));
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
		justify-content: space-between;
		gap: 0.5rem;
		min-height: 2.75rem;
		padding: 0.25rem 0.75rem;
		border-left: 3px solid transparent;
		border-radius: 0 var(--ms-radius) var(--ms-radius) 0;
		font-family: var(--ms-heading-font);
		font-size: 0.85rem;
		letter-spacing: 0.08em;
		text-transform: var(--admin-nav-transform, none);
		text-decoration: none;
		color: var(--admin-header-text, var(--ms-muted));
	}

	.menu a:hover {
		color: var(--admin-header-text, var(--ms-text));
		background: color-mix(in srgb, currentColor 8%, transparent);
	}

	.menu a[aria-current='page'] {
		border-left-color: var(--ms-accent);
		color: var(--admin-header-text, var(--ms-text));
		font-weight: 600;
		background: color-mix(in srgb, currentColor 8%, transparent);
	}

	.label {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		min-width: 1.4rem;
		height: 1.4rem;
		padding: 0 0.35rem;
		border-radius: 999px;
		background: var(--ms-accent);
		color: var(--ms-on-accent);
		font-family: var(--ms-font);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: normal;
		font-variant-numeric: tabular-nums;
	}

	.bottom {
		display: flex;
		flex-direction: column;
		padding: 1rem 0.75rem 0;
		border-top: 1px solid var(--ms-border);
	}

	.bottom a {
		display: flex;
		align-items: center;
		min-height: 2.75rem;
		color: var(--admin-header-text, var(--ms-muted));
		text-decoration: none;
		font-size: 0.9rem;
	}

	.bottom a:hover {
		color: var(--admin-header-text, var(--ms-text));
		text-decoration: underline;
	}

	.user {
		margin: 0.25rem 0;
		font-size: 0.85rem;
		color: var(--admin-header-text, var(--ms-muted));
		overflow-wrap: anywhere;
	}

	/* From laptop width: the sidebar, which stays in place while the page
	   scrolls and scrolls itself when the menu is taller than the screen. */
	@media (min-width: 64rem) {
		.ms-admin {
			display: grid;
			grid-template-columns: 15rem minmax(0, 1fr);
			align-items: start;
		}

		.bar {
			display: none;
		}

		.side {
			position: sticky;
			top: 0;
			display: flex;
			flex-direction: column;
			gap: 1.5rem;
			height: 100vh;
			overflow: hidden;
			padding: 1.25rem 0.75rem 1.25rem;
			border-right: 1px solid var(--ms-border);
		}

		.side .brand {
			padding: 0 0.75rem;
		}

		/* Only the menu scrolls, so the logo and the bottom stay in view. */
		.side .menu {
			flex: 1;
			min-height: 0;
			overflow-y: auto;
		}
	}

	@media print {
		.ms-admin {
			display: block;
		}

		.side,
		.bar {
			display: none;
		}
	}

	.main {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		width: 100%;
		max-width: 62rem;
		margin: 0 auto;
		padding: 2rem 1.25rem 4rem;
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
