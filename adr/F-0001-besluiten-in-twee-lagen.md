# F-0001: Besluiten staan als ADR, in twee lagen

- **Status:** aangenomen
- **Datum:** 30 oktober 2026

## Context

De regels van een project stonden in één lang `CLAUDE.md`, zonder de reden
erbij. Een regel zonder reden wordt door de volgende ontwikkelaar, mens of
agent, net zo makkelijk weer omgegooid. Het eerste project heeft zijn
besluiten daarom als losse ADR's opgeschreven.

Met een tweede product op dezelfde opzet kwamen dezelfde besluiten twee keer
voor, en ze liepen uit elkaar: het ene project gaf een nieuwe tabel rechten
en RLS, het andere alleen rechten. Een besluit dat in twee projecten staat,
wordt in één ervan bijgewerkt.

## Besluit

- Een keuze die lastig terug te draaien is, meerdere plekken raakt, of waar
  een volgende ontwikkelaar anders zou kiezen zonder de reden te kennen, krijgt
  een ADR: status, datum, en de kopjes Context, Besluit, Gevolgen en In de
  code.
- Er zijn twee lagen. Wat voor elk product geldt, staat in deze repo als
  fabrieksbesluit (`F-NNNN`). Wat bij één product hoort, staat in dat project
  in `docs/adr/` (`NNNN`).
- Een projectbesluit dat een fabrieksbesluit uitwerkt, zegt "Volgt: F-NNNN".
  Een project dat bewust afwijkt, schrijft een projectbesluit met "Wijkt af
  van: F-NNNN" en de reden. Zonder dat geldt de fabriek.
- Een aangenomen besluit wordt niet herschreven. Verandert het, dan komt er
  een nieuw besluit en krijgt het oude "vervangen door".
- `CLAUDE.md` houdt de korte regel en verwijst naar het nummer. Een test die
  een besluit afdwingt, noemt het nummer ook.
- Een test controleert de opbouw, hier en in elk project.

## Gevolgen

- Een verbeterd fabrieksbesluit geldt meteen voor elk product; de projecten
  hoeven alleen hun verwijzing te houden.
- Een agent die in een project werkt, kent de fabrieksbesluiten via de skill
  `fabrieksbesluiten`, zonder dat ze in elk `CLAUDE.md` herhaald worden.
- Deze repo is publiek. Een fabrieksbesluit beschrijft hoe er gebouwd wordt,
  nooit gegevens van een bedrijf, een klant of een betrokkene.
- Een besluit dat alleen in een project staat maar in een tweede project
  terugkomt, verhuist hierheen.

## In de code

- `adr/README.md`: de opbouw en de lijst.
- `tests/adr.test.mjs` controleert de opbouw en of elk besluit in beide
  lijsten staat.
- De skill `adr-schrijven` schrijft een besluit in de goede laag; de skill
  `fabrieksbesluiten` laadt deze besluiten.
