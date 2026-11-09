// Accessibility issues that were on the site when it was taken into the
// factory (skill setup-product). Each one is excluded by page and by axe rule,
// so the test passes and a new issue still fails it. Remove a line when the
// issue is fixed; never add one for something new.
//
// A new product starts with an empty list.

export const KNOWN_ISSUES: { page: string; rule: string; note: string }[] = [
	// { page: '/', rule: 'color-contrast', note: 'grey text on the hero image' },
];
