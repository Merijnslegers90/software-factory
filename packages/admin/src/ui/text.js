// The words of the admin blocks (F-0020). Dutch by default: the admins are
// for the owner and his Dutch customers. A product replaces any of them
// through the `text` prop of a block; a key it leaves out keeps the default.

export const SHELL_TEXT = Object.freeze({
	admin: 'admin',
	menu: 'Menu',
	closeMenu: 'Menu sluiten',
	viewSite: 'Bekijk site',
	logout: 'Uitloggen',
	newWindow: '(opent in een nieuw venster)',
	open: 'openstaand',
	loggedIn: 'Ingelogd als'
});

export const OVERVIEW_TEXT = Object.freeze({
	facts: 'De site',
	links: 'Handig',
	morning: 'Goedemorgen',
	afternoon: 'Goedemiddag',
	evening: 'Goedenavond'
});

export const TODO_TEXT = Object.freeze({
	title: 'Te doen',
	none: 'Er wacht niets.'
});

export const PROPOSALS_TEXT = Object.freeze({
	title: 'Voorstellen',
	none: 'Er staan geen voorstellen open.',
	intro: 'Deze wijzigingen wachten op een merge. Pas daarna staan ze live.',
	todoOne: 'voorstel wacht op een merge',
	todoMany: 'voorstellen wachten op een merge',
	updated: 'bijgewerkt',
	open: 'Bekijk op GitHub',
	off: 'Voorstellen zijn niet te zien: {missing} ontbreekt.',
	outcomes: Object.freeze({
		'key-refused': 'GitHub weigert de sleutel. Er is een nieuwe nodig.',
		unavailable: 'GitHub is nu niet bereikbaar. Probeer het straks opnieuw.'
	})
});

export const FORM_TEXT = Object.freeze({
	save: 'Voorstel opslaan',
	saving: 'Opslaan...',
	add: 'Toevoegen',
	remove: 'Verwijderen',
	up: 'Omhoog',
	down: 'Omlaag',
	item: 'Item',
	empty: 'Nog niets.',
	yes: 'Aan',
	openProposal:
		'Er staat al een voorstel open. Je ziet die versie; opslaan voegt je wijziging eraan toe.',
	saved: 'Opgeslagen. Je voorstel staat klaar om te mergen.',
	unchanged: 'Er was niets veranderd.',
	viewProposal: 'Bekijk het voorstel',
	leave: 'Je wijzigingen zijn nog niet opgeslagen. Toch weggaan?',
	fixErrors: 'Niet opgeslagen: kijk naar de velden met een melding.',
	priceHint: 'In euro, bijvoorbeeld 4,50',
	errors: Object.freeze({
		required: 'Vul dit in.',
		'too-long': 'Dit is te lang.',
		'not-text': 'Dit is geen tekst.',
		'not-a-price': 'Dit is geen prijs. Schrijf bijvoorbeeld 4,50.',
		'not-a-link': 'Dit is geen link. Begin met / of https://.',
		'not-a-list': 'Dit is geen lijst.',
		'too-few': 'Er zijn te weinig items.',
		'too-many': 'Er zijn te veel items.',
		'not-readable': 'Het formulier kwam niet goed aan. Probeer het opnieuw.',
		'fixed-list': 'Hier kun je niets toevoegen of weghalen. Laad de pagina opnieuw.'
	}),
	outcomes: Object.freeze({
		'no-key': 'Opslaan staat uit: {missing} ontbreekt.',
		'key-refused': 'GitHub weigert de sleutel. Er is een nieuwe nodig.',
		'no-write':
			'De sleutel mag lezen maar niet schrijven. Zet bij het token Contents en Pull requests op lezen en schrijven.',
		'branch-blocked':
			'Er staat een branch "admin" in de repo. Die houdt elk voorstel tegen; verwijder hem op GitHub.',
		'not-allowed': 'Dit bestand mag de admin niet aanpassen.',
		conflict: 'Iemand anders sloeg tegelijk iets op. Probeer het opnieuw.',
		unavailable: 'GitHub is nu niet bereikbaar. Probeer het straks opnieuw.',
		mismatch:
			'Het bestand past niet meer bij dit formulier ({at}). Opslaan staat uit, zodat er niets verloren gaat.'
	})
});

export const CONTENT_TEXT = Object.freeze({
	sections: 'Onderdelen',
	proposal: 'voorstel open'
});

/** The defaults with the product's own words over them, one level deep for groups. */
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

/** Fills `{name}` in a text. */
export function fill(text, values = {}) {
	return String(text).replace(/\{(\w+)\}/g, (match, name) =>
		values[name] === undefined ? match : String(values[name])
	);
}

/** A list of names in Dutch: `A`, `A en B`, `A, B en C`. */
export function joinNames(names) {
	if (names.length <= 1) return names.join('');
	return `${names.slice(0, -1).join(', ')} en ${names.at(-1)}`;
}

/** A date and time in Dutch, such as `20 november, 16:30`. */
export function shortDate(iso, locale = 'nl-NL') {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';
	return new Intl.DateTimeFormat(locale, {
		day: 'numeric',
		month: 'long',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Amsterdam'
	}).format(date);
}

/** Whether a menu item is the current page: `/admin` only exactly, the rest also below it. */
export function isCurrent(href, pathname, base = '/admin') {
	if (href === base) return pathname === base || pathname === `${base}/`;
	return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The menu as groups (#43). A product passes groups, `{ title, items }`, or
 * the flat list it passed before, which becomes one group without a title.
 */
export function navGroups(nav = []) {
	if (nav.length === 0) return [];
	if (nav.every((entry) => Array.isArray(entry?.items))) return nav;
	return [{ title: undefined, items: nav }];
}

/** A count as the badge shows it: nothing for 0 or no number, 99+ above 99. */
export function countLabel(count) {
	if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return '';
	return count > 99 ? '99+' : String(Math.floor(count));
}

/** Everything open in the menu together, for the menu button and the tab title. */
export function totalCount(groups) {
	return groups
		.flatMap((group) => group.items)
		.reduce((sum, item) => sum + (countLabel(item.count) ? Math.floor(item.count) : 0), 0);
}

/** The tab title with what is open in front: "(2) Admin Frietwagen Someren". */
export function titleWithCount(title, total) {
	return total > 0 ? `(${total}) ${title}` : title;
}

/** The hour of a moment in a time zone, 0 to 23. */
function hourIn(date, timeZone) {
	const hour = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(date);
	return Number(hour);
}

/** "Goedemorgen" until noon, "Goedemiddag" until six, then "Goedenavond". */
export function greeting(date, timeZone = 'Europe/Amsterdam', text = OVERVIEW_TEXT) {
	const hour = hourIn(date, timeZone);
	if (hour >= 6 && hour < 12) return text.morning;
	if (hour >= 12 && hour < 18) return text.afternoon;
	return text.evening;
}

/** The date for the head of the overview: "maandag 23 november". */
export function longDate(date, timeZone = 'Europe/Amsterdam') {
	return new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', timeZone }).format(date);
}

/**
 * The open proposals of F-0018 as one line for AdminTodo, or none when
 * nothing waits: "2 voorstellen wachten op een merge", linking to the list on
 * GitHub (one proposal links to itself).
 */
export function proposalsTodo(data, text = PROPOSALS_TEXT) {
	if (data?.outcome !== 'ok' || data.proposals.length === 0) return [];
	const count = data.proposals.length;
	const first = data.proposals[0].url;
	const href = count === 1 ? first : first.replace(/\/pull\/\d+$/, '/pulls');
	return [{ count, text: count === 1 ? text.todoOne : text.todoMany, href }];
}
