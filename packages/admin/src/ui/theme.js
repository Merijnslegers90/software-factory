// The theme of an admin (F-0020): the product's own look through a handful of
// CSS variables, set in one place. What a product leaves out keeps the calm
// default. The layout of the blocks is shared and cannot be changed here.

/** The keys of a theme and the CSS variable each one sets. */
export const THEME_KEYS = Object.freeze({
	bg: '--admin-bg',
	surface: '--admin-surface',
	text: '--admin-text',
	muted: '--admin-muted',
	border: '--admin-border',
	inputBorder: '--admin-input-border',
	accent: '--admin-accent',
	onAccent: '--admin-on-accent',
	headerBg: '--admin-header-bg',
	headerText: '--admin-header-text',
	error: '--admin-error',
	errorBg: '--admin-error-bg',
	warningBg: '--admin-warning-bg',
	okBg: '--admin-ok-bg',
	font: '--admin-font',
	headingFont: '--admin-heading-font',
	headingTransform: '--admin-heading-transform',
	navTransform: '--admin-nav-transform',
	radius: '--admin-radius'
});

// Only colours, font names, lengths and a few words: a value cannot end the
// declaration or open a new one.
const SAFE = /^[\w\s#%(),.'"+-]+$/;

/**
 * The inline style for a theme: `{ accent: '#f2b705', dark: { bg: '#000' } }`
 * becomes `--admin-accent: #f2b705; --admin-dark-bg: #000`. The dark values
 * apply when the device asks for dark, or always with `scheme: 'dark'`.
 */
export function themeStyle(theme = {}) {
	const declarations = [];
	const add = (values, prefix) => {
		for (const [key, value] of Object.entries(values ?? {})) {
			if (key === 'dark' || key === 'scheme' || value === undefined || value === null || value === '') continue;
			const variable = THEME_KEYS[key];
			if (!variable) throw new Error(`theme: unknown key ${key}.`);
			if (!SAFE.test(String(value))) throw new Error(`theme: ${key} has a value that is not allowed.`);
			declarations.push(`${variable.replace('--admin-', prefix)}: ${value}`);
		}
	};
	add(theme, '--admin-');
	add(theme.dark, '--admin-dark-');
	return declarations.join('; ');
}

/** `auto` follows the device; `light` and `dark` fix one. */
export function schemeClass(theme = {}) {
	return theme.scheme === 'light' || theme.scheme === 'dark' ? theme.scheme : 'auto';
}
