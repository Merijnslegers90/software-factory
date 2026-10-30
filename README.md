# software-factory

How I build software: shared skills, agents, architecture decisions, CI and
libraries for every product.

Elk product wordt op dezelfde manier gebouwd: dezelfde stack, dezelfde
afspraken in de repo, dezelfde controles, en agents die met een specificatie
werken en door een review moeten. Alles wat die manier van bouwen is, staat
hier. De producten zelf staan in hun eigen repo's en houden alleen wat bij dat
product hoort.

## Wat er staat

```
.claude-plugin/marketplace.json   deze repo als plugin-marketplace voor Claude Code
plugins/software-factory/
  skills/fabrieksbesluiten/       laadt de fabrieksbesluiten, zodat elke agent ze kent
  skills/nieuwe-migratie/         een Supabase-migratie met rechten en RLS
  skills/adr-schrijven/           een besluit vastleggen in de goede laag
  agents/fabrieksreview.md        toetst een wijziging aan de regels en besluiten
adr/                              fabrieksbesluiten (F-0001, F-0002, ...)
.github/workflows/kwaliteit.yml   herbruikbare CI-workflow
tests/                            controles op deze repo zelf
```

Nog te bouwen: hooks (lint en format na een wijziging), de gedeelde pakketten
onder `packages/` (`migraties`, `config`, `admin`, `mail`), skills voor een
adminscherm, een mailsoort, een spec en een nieuw product, en de werkwijze in
`docs/werkwijze.md`.

## Een project aansluiten

**Skills en agents.** Zet de marketplace in `.claude/settings.json` van het
project. Er wordt niets gekopieerd; een verbeterde skill geldt meteen overal.

```json
{
	"extraKnownMarketplaces": {
		"software-factory": {
			"source": { "source": "github", "repo": "Merijnslegers90/software-factory" }
		}
	},
	"enabledPlugins": {
		"software-factory@software-factory": true
	}
}
```

Voor losse installatie, buiten een project:
`/plugin install software-factory --marketplace Merijnslegers90/software-factory`.

De skills heten `software-factory:fabrieksbesluiten`,
`software-factory:nieuwe-migratie` en `software-factory:adr-schrijven`, de
agent `software-factory:fabrieksreview`.

**CI.** Vervang de eigen workflow door een aanroep van de centrale:

```yaml
name: Kwaliteitscontrole

on:
  push:
    branches: [main]
  pull_request:

jobs:
  kwaliteit:
    uses: Merijnslegers90/software-factory/.github/workflows/kwaliteit.yml@v1
    with:
      e2e: true
```

De workflow draait `lint`, `check`, `test` en `build`, en met `e2e: true` ook
`test:e2e`, met de nepwaarden uit `.env.example`. Verder in te stellen:
`node-versie`, `pnpm-versie` (leeg is `packageManager` uit `package.json`),
`env-bestand`, `build` en `timeout-minuten`.

**Besluiten.** Een project houdt zijn eigen besluiten in `docs/adr/` en
verwijst naar de fabriek met "Volgt: F-NNNN" of, bewust, "Wijkt af van:
F-NNNN". Zie [adr/README.md](adr/README.md).

## Versies

De workflow wordt aangeroepen op een hoofdversie (`@v1`). Een wijziging die een
project kan breken, wordt `v2`; de rest schuift onder `v1` mee. De plugin volgt
`main`.

## Omdat de repo publiek is

Hier staat de manier van bouwen, nooit gegevens van een bedrijf, een klant of
een betrokkene, geen sleutels en geen interne adressen. `tests/publiek.test.mjs`
zoekt naar sleutels, e-mailadressen, telefoonnummers en KVK- en btw-nummers.

## Controles

```bash
npm test                          # besluiten, plugin, publiek
claude plugin validate .          # de marketplace
claude plugin validate plugins/software-factory
```

De workflow `zelfcontrole.yml` draait ze op elke pull request.
