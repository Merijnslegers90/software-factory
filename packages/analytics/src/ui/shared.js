// Small helpers for the visitor blocks; the same as in @merijnslegers/admin,
// so this package needs no other package.

export function withText(defaults, text = {}) {
	const merged = { ...defaults };
	for (const [key, value] of Object.entries(text ?? {})) {
		if (value === undefined || value === null) continue;
		merged[key] =
			typeof value === 'object' && typeof defaults[key] === 'object'
				? { ...defaults[key], ...value }
				: value;
	}
	return merged;
}

export function fill(text, values = {}) {
	return String(text).replace(/\{(\w+)\}/g, (match, name) =>
		values[name] === undefined ? match : String(values[name])
	);
}

/** A number in Dutch: 1.234. */
export function number(n) {
	return new Intl.NumberFormat('nl-NL').format(n ?? 0);
}

/** The change as text and its direction: `+12%`, `-3%`, `nieuw`. */
export function changeText(change, newWord) {
	if (change === 'new') return { text: newWord, direction: 'up' };
	if (typeof change !== 'number') return null;
	const sign = change > 0 ? '+' : change < 0 ? '−' : '';
	return {
		text: `${sign}${Math.abs(change)}%`,
		direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same'
	};
}

/** A short date for the series: `3 nov` for a day. */
export function seriesLabel(start) {
	const date = new Date(`${start}T12:00:00Z`);
	return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date);
}

/** Width of a bar as a percentage of the largest value. */
export function barWidth(value, max) {
	return max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
}

/** A count short enough to stand above a bar: 840, 1,2k, 12k. */
export function shortNumber(value) {
	if (value < 1000) return String(value);
	const thousands = value / 1000;
	const text = thousands < 10 ? thousands.toFixed(1).replace('.', ',').replace(',0', '') : String(Math.round(thousands));
	return `${text}k`;
}

/** Up to this many bars the counts always stand above them; with more, only on a wide screen. */
export const COUNTS_ALWAYS = 14;
