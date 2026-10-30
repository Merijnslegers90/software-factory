# F-0005: Een functie die een sleutel nodig heeft, staat uit zonder die sleutel

- **Status:** aangenomen
- **Datum:** september 2026

## Context

Een product hangt aan externe diensten: betalen, mailen, boekhouden, een
taalmodel. Elk daarvan heeft een sleutel. Een build die stukloopt op een
ontbrekende sleutel, liet in Vercel alleen een regel diep in de log achter.
Een functie die geld kost voordat iemand besloot hem te gebruiken, is een
rekening die je pas achteraf ziet. En een CI die sleutels nodig heeft, kan een
pull request van buiten niet controleren.

## Besluit

- Sleutels en instellingen van externe diensten worden bij het draaien
  gelezen (`$env/dynamic/private`), niet bij het bouwen.
- Ontbreekt de sleutel, dan staat de functie uit: er gaat geen enkele aanroep
  naar de dienst, en het scherm en het menu-item verdwijnen. Waar iemand de
  functie zou zoeken (in de admin), staat de naam van wat er ontbreekt.
- De build faalt nooit op een ontbrekende sleutel.
- `.env.example` noemt elke variabele, met een nepwaarde. Daarmee draaien
  `check`, `build` en de CI zonder één echte sleutel.
- Een functie die open op internet staat en geld kost, krijgt een eigen
  sleutel, los van de functies achter de inlog. Zo is hij apart in te trekken
  en zie je per sleutel wat hij kost.

## Gevolgen

- Een functie aanzetten is één variabele zetten en opnieuw deployen.
- De code heeft voor elke functie een pad voor "uit", en dat pad wordt getest:
  een menu-item achter een schakelaar die uit staat, valt weg.
- Een nieuwe dienst krijgt meteen een regel in `.env.example`.

## In de code

- `.env.example` in elk project; `.github/workflows/kwaliteit.yml` kopieert
  het naar `.env`.
- Het menu van de admin heeft een `schakelaar` per item, met een test.
