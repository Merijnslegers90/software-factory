// Accessibility issues that were on the site when it was taken into the
// factory (skill setup-product), so the test passes from the start.
//
// An entry with `target` excludes only that element (the selector axe reports
// under "where"); an entry without it excludes the whole rule on that page,
// including a new element that breaks the same rule. Prefer `target`. Remove a
// line when the issue is fixed; never add one for something new.
//
// A new product starts with an empty list.

export const KNOWN_ISSUES: { page: string; rule: string; target?: string; note: string }[] = [
	// { page: '/', rule: 'color-contrast', target: '.hero > p', note: 'grey text on the hero image' },
];
