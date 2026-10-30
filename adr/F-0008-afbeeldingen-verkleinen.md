# F-0008: Afbeeldingen worden in de browser verkleind voor de upload

- **Status:** aangenomen
- **Datum:** september 2026

## Context

Een functie op Vercel neemt ongeveer 4,5 MB per verzoek aan. Een foto uit een
telefoon is een paar megabyte, dus ongemoeid komt hij niet eens bij de
serveractie aan, en twee foto's in één formulier zeker niet. Een groot
origineel in Storage kost daarna bij elke weergave dataverkeer, en op het
gratis plan van Supabase is dat begrensd.

## Besluit

- Een afbeelding wordt in de browser verkleind voordat hij wordt geüpload,
  naar een vaste maximale breedte per soort gebruik (een foto in een mail, een
  screenshot op de site) en naar een compact formaat.
- Pas het verkleinde bestand gaat naar de serveractie, en die zet het in
  Storage onder een eigen pad.
- Een afbeelding die een buitenstaander moet laden, komt in een publieke
  bucket (F-0004); de rest niet.

## Gevolgen

- De server ziet het origineel nooit, en een origineel wordt niet bewaard. Is
  dat ooit nodig, dan is dat een nieuw besluit.
- De breedtes per soort staan op één plek in de code, zodat een mail en de
  site niet elk een eigen maat gaan kiezen.

## In de code

- Het verkleinen in de admin van elk project. Dat wordt onderdeel van
  `packages/admin`.
