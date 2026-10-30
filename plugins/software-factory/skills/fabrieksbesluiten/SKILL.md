---
name: fabrieksbesluiten
description: De besluiten die voor elk product van de fabriek gelden (stack, database, migraties, sleutels, tests, CI, afbeeldingen). Gebruik dit voordat je een keuze maakt over architectuur, de database, een externe dienst, omgevingsvariabelen, tests of de CI, en bij elke review.
---

# Fabrieksbesluiten

Dit zijn de besluiten die voor elk product gelden. Het project heeft daarnaast
eigen besluiten in `docs/adr/` en regels in `CLAUDE.md`. Een project mag
afwijken, maar alleen met een projectbesluit dat "Wijkt af van: F-NNNN" zegt.
Staat dat er niet, dan geldt de regel hieronder, ook als de code het nu anders
doet: dan is de code achter, niet het besluit.

Elke regel hieronder is de korte versie. Het hele besluit, met de reden en de
gevolgen, staat in `adr/` naast dit bestand. Lees het hele besluit zodra je
werk het raakt.

## De besluiten

| Nr     | Regel                                                                                                                                                                                  | Bestand                              |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| F-0001 | Een keuze die lastig terug te draaien is of meerdere plekken raakt, krijgt een ADR: fabrieksbreed hier, anders in `docs/adr/` van het project.                                         | `adr/F-0001-besluiten-in-twee-lagen.md` |
| F-0002 | SvelteKit 2 (Svelte 5), TypeScript, Tailwind 4, Vercel, Supabase, pnpm, Node 22. Vaste scripts: `lint`, `check`, `test`, `build`, `test:e2e`.                                         | `adr/F-0002-een-stack.md`               |
| F-0003 | Migraties in `supabase/migrations/` draaien mee bij de productie-deploy (`vercel-build`). Niets met de hand in de editor; een toegepaste migratie pas je nooit meer aan.               | `adr/F-0003-migraties-bij-deploy.md`    |
| F-0004 | Alleen de server praat met de database, met `service_role`. Elke nieuwe tabel: grant aan `service_role` en RLS aan, zonder policies. Functies met `search_path = ''`.                 | `adr/F-0004-database-alleen-server.md`  |
| F-0005 | Sleutels worden bij het draaien gelezen (`$env/dynamic/private`). Zonder sleutel staat de functie uit, zonder aanroep; de build faalt nooit. Elke variabele staat in `.env.example`. | `adr/F-0005-uit-zonder-sleutel.md`      |
| F-0006 | Rekenwerk en regels in pure modules met een test ernaast; database en diensten in dunne server-only modules. Een test die een besluit afdwingt, noemt het nummer.                     | `adr/F-0006-logica-puur-en-getest.md`   |
| F-0007 | Elke PR gaat door de centrale workflow `kwaliteit.yml` (zonder secrets) en door de agent `fabrieksreview` voordat hij wordt gemerged.                                                 | `adr/F-0007-een-kwaliteitscontrole.md`  |
| F-0008 | Afbeeldingen worden in de browser verkleind voor de upload, naar een vaste breedte per soort; alleen wat buitenstaanders laden staat in een publieke bucket.                          | `adr/F-0008-afbeeldingen-verkleinen.md` |

## Als je werk een besluit raakt

- Volg het besluit, en noem het nummer waar het helpt: in een commentaar bij
  een test die het afdwingt, of in de beschrijving van de pull request.
- Lijkt een besluit niet te passen bij wat je moet bouwen, kies dan niet stil
  iets anders. Zeg het, en stel een projectbesluit voor met "Wijkt af van"
  (skill `adr-schrijven`).
- Neem je zelf een besluit dat voor elk product zou gelden, stel dan een nieuw
  fabrieksbesluit voor in plaats van een projectbesluit.
