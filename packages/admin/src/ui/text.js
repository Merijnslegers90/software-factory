// The words of the admin blocks (F-0020). Dutch by default: the admins are
// for the owner and his Dutch customers. A product replaces any of them
// through the `text` prop of a block; a key it leaves out keeps the default.

export const SHELL_TEXT = Object.freeze({
	admin: 'admin',
	menu: 'Menu',
	closeMenu: 'Menu sluiten',
	viewSite: 'Bekijk site',
	logout: 'Uitloggen',
	newWindow: '(opent in een nieuw venster)'
});

export const OVERVIEW_TEXT = Object.freeze({
	facts: 'De site',
	links: 'Handig'
});

export const PROPOSALS_TEXT = Object.freeze({
	title: 'Voorstellen',
	none: 'Er staan geen voorstellen open.',
	intro: 'Deze wijzigingen wachten op een merge. Pas daarna staan ze live.',
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
