# Fabrieksbesluiten

Hier staan de besluiten die voor elk product van de fabriek gelden, één
bestand per besluit. Een project houdt daarnaast zijn eigen besluiten bij in
`docs/adr/`, voor wat alleen bij dat product hoort. Waarom het zo in twee
lagen gaat, staat in [F-0001](F-0001-besluiten-in-twee-lagen.md).

## Wanneer is het een fabrieksbesluit

Als het voor elk product zou gelden: de stack, hoe de database wordt
aangesproken, hoe er wordt gedeployd, wat de CI controleert. Gaat het over
één product (een boekhoudpakket, een betaalprovider, de opbouw van een
scherm), dan is het een projectbesluit.

Twijfel je, begin dan in het project. Een besluit dat in een tweede project
terugkomt, hoort hier, en de projectbesluiten krijgen dan de status
"vervangen door F-NNNN".

## Hoe

- Een nieuw bestand `F-NNNN-korte-titel.md`, met het volgende vrije nummer.
- Bovenaan `# F-NNNN: Titel`, dan de status en de datum, en daarna de vier
  vaste kopjes: **Context**, **Besluit**, **Gevolgen** en **In de code**.
- Status is een van: `voorgesteld`, `aangenomen`, `vervangen door F-NNNN` of
  `vervallen`.
- Een aangenomen besluit pas je niet achteraf aan. Verandert het, schrijf dan
  een nieuw besluit, zet in het oude "vervangen door F-NNNN" en in het nieuwe
  "Vervangt: F-NNNN". Een verduidelijking of een verwijzing die niet meer
  klopt mag wel.
- Zet het besluit in de lijst hieronder en in de lijst van de skill
  `fabrieksbesluiten`, met de korte regel. Zo kent elke agent het.

`tests/adr.test.mjs` controleert de nummering, de kopjes, de status, de
verwijzingen en beide lijsten. Geen gedachtestreepjes, ook hier niet.

## Hoe een project ernaar verwijst

- Werkt een projectbesluit een fabrieksbesluit uit, zet er dan
  `- **Volgt:** F-NNNN` onder de datum.
- Wijkt een project bewust af, dan is dat een projectbesluit met
  `- **Wijkt af van:** F-NNNN` en de reden in de context. Zonder zo'n besluit
  geldt de fabriek.
- In de `CLAUDE.md` van een project verwijst de korte regel naar het nummer,
  net als bij een projectbesluit ("F-0004").

Besluiten met een datum van vóór 30 oktober 2026 zijn achteraf opgeschreven
uit wat de eerste twee producten al deden. De datum is die van het besluit
zelf.

## Lijst

| Nr                                          | Besluit                                                       | Status     |
| ------------------------------------------- | ------------------------------------------------------------- | ---------- |
| [F-0001](F-0001-besluiten-in-twee-lagen.md) | Besluiten staan als ADR, in twee lagen                        | aangenomen |
| [F-0002](F-0002-een-stack.md)               | Eén stack voor elk product                                    | aangenomen |
| [F-0003](F-0003-migraties-bij-deploy.md)    | Migraties draaien mee bij de productie-deploy                 | aangenomen |
| [F-0004](F-0004-database-alleen-server.md)  | De database alleen vanaf de server, met service_role          | aangenomen |
| [F-0005](F-0005-uit-zonder-sleutel.md)      | Een functie die een sleutel nodig heeft, staat uit zonder     | aangenomen |
| [F-0006](F-0006-logica-puur-en-getest.md)   | Logica puur en getest, de buitenwereld in server-only modules | aangenomen |
| [F-0007](F-0007-een-kwaliteitscontrole.md)  | Elke wijziging gaat door dezelfde kwaliteitscontrole          | aangenomen |
| [F-0008](F-0008-afbeeldingen-verkleinen.md) | Afbeeldingen worden in de browser verkleind voor de upload    | aangenomen |
| [F-0009](F-0009-een-project-per-product.md) | Elk product een eigen Supabase-project                        | aangenomen |
