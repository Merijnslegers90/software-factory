# F-0006: Logica puur en getest, de buitenwereld in server-only modules

- **Status:** aangenomen
- **Datum:** september 2026

## Context

Er is geen testdatabase, en de meeste externe diensten zijn vanuit de
ontwikkelomgeving niet bereikbaar. Tegelijk verandert de code snel, vaak door
een agent, en de tests zijn de poort waar een wijziging langs moet. Rekenwerk
dat midden in een databaseaanroep staat, valt zo buiten elke test.

## Besluit

- Rekenwerk, regels, het uitlezen van formulieren en berichten, en het maken
  van tekst en HTML staan in pure modules: geen database, geen netwerk, geen
  omgevingsvariabelen. Met een test ernaast (`x.ts` en `x.test.ts`).
- Wat de database of een externe dienst aanroept, staat in een server-only
  module, en die doet zo weinig mogelijk zelf: ophalen, de pure functie
  aanroepen, wegschrijven.
- Een regel die niet mag breken (wettelijk, beveiliging, geld) ligt vast in
  een test. Komt de regel uit een besluit, dan noemt de test het nummer.
- Wat niet tegen de echte dienst getest is, staat er eerlijk bij: in het
  besluit of in `CLAUDE.md` ("niet getest tegen de echte API").

## Gevolgen

- De unit-tests draaien zonder `.env` en zonder netwerk, dus overal en snel.
- Een koppeling met een dienst blijft dun, en is daardoor later achter een
  interface te zetten met een adapter per leverancier.
- De review let erop dat nieuw rekenwerk niet in een server-only module of een
  component belandt.

## In de code

- De `*.test.ts`-bestanden naast de pure modules in elk project.
- De agent `fabrieksreview` toetst hierop.
