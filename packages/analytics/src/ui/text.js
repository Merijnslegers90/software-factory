// The words of the visitor blocks (F-0020), Dutch by default. A product
// replaces any of them through the `text` prop.

export const VISITORS_TEXT = Object.freeze({
	title: 'Bezoekers',
	period: 'Periode',
	days: '{n} dagen',
	visitors: 'Bezoekers',
	pageviews: 'Paginaweergaven',
	thisMonth: 'Deze maand',
	sincePrevious: 'ten opzichte van de periode ervoor',
	sinceLastMonth: 'ten opzichte van vorige maand tot dezelfde dag',
	new: 'nieuw',
	series: 'Per dag',
	seriesWeek: 'Per week',
	showTable: 'Als tabel',
	date: 'Datum',
	pages: 'Meest bekeken pagina’s',
	referrers: 'Waar bezoekers vandaan komen',
	direct: 'Direct of onbekend',
	other: 'Overige',
	none: 'Nog geen bezoekers in deze periode.',
	more: 'Alle bezoekers',
	reasons: Object.freeze({
		'no-key': 'De bezoekers zijn niet te zien: de sleutel voor Vercel Analytics ontbreekt.',
		'key-refused': 'Vercel weigert de sleutel. Maak een nieuwe aan.',
		unavailable: 'Vercel is nu niet bereikbaar. Probeer het straks opnieuw.',
		'unexpected-response': 'Vercel gaf een antwoord dat we niet begrijpen.'
	})
});

export { withText, fill } from './shared.js';
