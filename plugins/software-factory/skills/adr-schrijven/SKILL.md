---
name: adr-schrijven
description: Een architectuurbesluit (ADR) vastleggen in de goede laag, als fabrieksbesluit of als projectbesluit (F-0001). Gebruik dit als je een keuze maakt die lastig terug te draaien is, meerdere plekken raakt of een bron van waarheid, externe dienst of beveiligingsgrens vastlegt, en als een bestaand besluit verandert.
---

# Een besluit vastleggen

## 1. Is het een besluit

Ja als de keuze lastig terug te draaien is, meerdere plekken in de code raakt,
of een volgende ontwikkelaar anders zou kiezen zonder de reden te kennen: een
bron van waarheid, een externe dienst, een beveiligingsgrens, een afspraak
tussen modules. Nee voor een lettergrootte, een veldnaam of een tekst.

## 2. Welke laag

- **Projectbesluit**, in `docs/adr/NNNN-korte-titel.md` van het project: het
  gaat over dit product (een leverancier, een scherm, een regel van dit
  bedrijf). Dit is de standaard.
- **Fabrieksbesluit**, in `adr/F-NNNN-korte-titel.md` van de repo
  `software-factory`: het zou voor elk product gelden. Dat schrijf je daar in
  een eigen pull request, niet in het project. Zeg in het project dat het
  besluit fabrieksbreed is en stel het voor.

Werkt het projectbesluit een fabrieksbesluit uit, zet dan
`- **Volgt:** F-NNNN` erin. Wijkt het er bewust van af, zet dan
`- **Wijkt af van:** F-NNNN` en leg in de context uit waarom.

## 3. Het bestand

Neem het volgende vrije nummer: `ls docs/adr`. Kopieer deze opbouw precies; de
ADR-test van het project leest hem.

```markdown
# ADR NNNN: Titel in gewone woorden

- **Status:** aangenomen
- **Datum:** 30 oktober 2026

## Context

Wat er speelde, en waarom er een keuze nodig was. Wat er misging of mis zou
gaan zonder.

## Besluit

Wat er geldt, als korte regels. Concreet: namen van bestanden, tabellen,
variabelen.

## Gevolgen

Wat het kost, wat er nu wel en niet kan, waar je op moet letten.

## In de code

Waar het terugkomt, en welke test het afdwingt.
```

- Een fabrieksbesluit begint met `# F-NNNN: Titel`.
- Status is `voorgesteld`, `aangenomen`, `vervangen door ADR NNNN` (of
  `vervangen door F-NNNN`) of `vervallen`.
- Een besluit dat al gold voordat het werd opgeschreven, krijgt de datum van
  het besluit zelf.
- Schrijf in de taal en de schrijfwijze van het project. Geen
  gedachtestreepjes.

## 4. Een besluit dat verandert

Pas een aangenomen besluit niet aan. Schrijf een nieuw besluit met
`- **Vervangt:** ADR NNNN` onder de datum, en zet in het oude
`- **Status:** vervangen door ADR NNNN`. Een verwijzing naar een bestand dat
verhuisd is, mag je wel bijwerken.

## 5. Erbij

- Zet het besluit in de lijst in `docs/adr/README.md` (of `adr/README.md` en de
  lijst van de skill `fabrieksbesluiten`, voor een fabrieksbesluit).
- Zet in `CLAUDE.md` de korte regel bij het onderwerp, met het nummer erachter
  ("ADR 0008"). Het waarom staat in het besluit, niet in `CLAUDE.md`.
- Dwingt een test het besluit af, noem dan het nummer in een commentaar in die
  test, en de test onder **In de code**.
- Draai de tests; de ADR-test controleert nummering, kopjes, status en lijst.
