# F-0007: Elke wijziging gaat door dezelfde kwaliteitscontrole

- **Status:** aangenomen
- **Datum:** 30 oktober 2026

## Context

Beide producten hadden een eigen CI-workflow, overgenomen van elkaar en daarna
uit elkaar gelopen: het ene bouwde niet maar draaide end-to-end-tests, het
andere bouwde wel, en de pnpm-versie kwam bij het ene uit de workflow en bij
het andere uit `package.json`. Een verbetering in de ene kwam niet vanzelf in
de andere.

## Besluit

- Elke pull request en elke push naar `main` draait `lint`, `check`, `test`
  en `build`, en `test:e2e` als het project end-to-end-tests heeft.
- Dat doet de herbruikbare workflow `kwaliteit.yml` uit deze repo. Een project
  heeft alleen een workflow van een paar regels die hem aanroept, met een
  vaste versie (`@v1`).
- De controle gebruikt de nepwaarden uit `.env.example` en heeft geen
  secrets nodig (F-0005).
- De workflow controleert alleen. Bouwen en publiceren doet Vercel: een
  preview per pull request, productie na de merge.
- Een wijziging gaat via een pull request naar `main`, en die wordt vóór de
  merge getoetst door de agent `fabrieksreview` en door een mens.

## Gevolgen

- Een stap die hier bijkomt, geldt in elk project zodra het de nieuwe versie
  gebruikt. Een wijziging die een project kan breken, wordt een nieuwe
  hoofdversie (`@v2`).
- Een project kan een stap uitzetten met een invoer van de workflow, maar niet
  ongemerkt een eigen variant gaan draaien.
- De vaste scriptnamen uit F-0002 zijn daarmee een afspraak die de CI
  afdwingt.

## In de code

- `.github/workflows/kwaliteit.yml`.
- `plugins/software-factory/agents/fabrieksreview.md`.
