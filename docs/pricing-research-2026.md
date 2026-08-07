# ELYAN — Belgische renovatieprijzen 2026 (audit-proof)

**Datasetversie:** 2026.2.1-audit  
**Marktdatum / geraadpleegd:** 7 augustus 2026  
**Markt:** België  
**Interne prijsbasis:** altijd **EXCLUSIEF BTW**

Dit document onderbouwt `shared/market-data-2026.js`.  
Drie soorten waarden (niet door elkaar gebruiken):

| Soort | Betekenis |
|---|---|
| **marketBenchmark** | Traceerbare BE-marktprijs (bij voorkeur ≥2 bronnen, duidelijke scope/btw) |
| **modelAssumption** | ELYAN-aanname bij onvoldoende harde data — bredere band |
| **officialRegulation** | Officiële regelgeving (btw, premies) |

**Regel (2026.2.1):** all-in €/m² of faseprijzen worden **niet** gebruikt om materiaal/arbeid te construeren via een %-split. All-in = sanity check. Componenten = materiaaleenheidsprijs + snijverlies + uren×tarief + expliciete overige.

---

## Normalisatieregels

1. Bron **excl. btw** → gebruiken zoals staat.  
2. Bron **incl. btw** én expliciet welk tarief in de tabel → delen door `(1 + tarief)`.  
3. Bron **incl. btw** zonder expliciet welk tarief in de gepubliceerde prijzen zit → **btw-ambigu**; documenteer norm@6% én @21% als soft only.  
4. BTW onduidelijk → geen harde baseline.  
5. Alleen scope-identieke bedragen vergelijken.

---

## 1. Arbeid (excl. btw)

| Trade | Low | Base | High | Bronnen |
|---|---:|---:|---:|---|
| Dakwerker | 45 | 62 | 75 | Vakmanprijzen dak |
| Loodgieter | 50 | 59 | 78 | Vakmanprijzen loodgieter |
| Elektricien | 45 | 55 | 65 | Vakmanindebuurt |
| Schilder | 35 | 45 | 60 | **Vakmanprijzen schilder** excl. (soft: Schilder-in-de-buurt incl. ambigu) |
| Tegelzetter | 45 | 52 | 65 | Afgeleid Bobex/Bouwplannen |
| Keukenmonteur | 45 | 52 | 60 | **modelAssumption** |

Productieve uren/dag **6,5** = modelAssumption.

---

## 2. Dak — componentmodel (55%-split verworpen)

### Sanity-check (all-in, niet voor mat/arb-constructie)

Vyverman hellend volledig €150–250/m² excl. (zonder steiger/goten/asbest als aparte post bewezen).

### Componenten

| Post | Band | Soort | Bron |
|---|---|---|---|
| Afbraak+afvoer | €8–15/m² | marketBenchmark als **overige** (geen strip-uren) | Vyverman |
| Onderdak materiaal | €6–13/m² | modelAssumption | onder faseprijs |
| Isolatie materiaal | €28–65/m² | modelAssumption | niet all-in fase × % |
| Latten | €4–9/m² | modelAssumption | — |
| Betonpannen materiaal | €26–36/m² | marketBenchmark | De Langhe; BKG excl. |
| Keramiek materiaal | €35–65/m² | marketBenchmark | De Langhe; BKG |
| Hulpstukken | €8–16/m² | marketBenchmark | De Langhe |
| Snijverlies | ×1,08 | modelAssumption | 5–10% |
| Plaatsing bedekking | 0,70–1,05 u/m² | modelAssumption | De Langhe plaatsing €50–60 ÷ ~€62/u |
| Steiger | €700–2800/project | modelAssumption | Blue Sky; Woongids |
| Goten | €30–85/lm all-in | marketBenchmark | Mijn-dakwerker (geen %-split) |
| Asbest | €22–45/m² | marketBenchmark | Keur e.a. |

**55% van Vyverman-fase** was geen marktfact → verwijderd.

---

## 3. Badkamer

Ongewijzigd: Badkamer-advies excl. bands.

---

## 4. Keuken (BE)

| Bron | Datum | Regio | BTW | Scope | Mat | Toestellen | Plaatsing | Techniek | Eenheid | Range |
|---|---|---|---|---|---|---|---|---|---|---|
| [Tipsentricks](https://www.tipsentricks.be/keuken-renoveren) | n.d./2026 | BE | **excl.** | Nieuwe keuken | ja (all-in) | vaak deels | **ja** | niet altijd | €/project | **10–25k** |
| Tipsentricks | idem | BE | excl. | Deelrenovatie/fronten | deels | nee | ja | nee | €/project | 0,5–3k |
| [Alkeba](https://www.alkeba.be/keuken/prijs/) | 2026 | BE | unclear | All-in soft | ja | variabel | ja | variabel | €/project | soft |
| [Bobex](https://www.bobex.be/nl-be/keuken/keukenrenovatie/) | 2026 | BE | unclear | Midden/luxe | ja | variabel | vaak | variabel | €/project | 8–12k / ≥20k |

Primary mid-benchmark: Tipsentricks €10–25k excl.  
Componenten (kasten €/m², uren) = **modelAssumption** → **confidence blijft gemiddeld**.

---

## 5. Vloeren

VP basisplaatsing + prep apart (ongewijzigd).

---

## 6. Schilderwerken — btw

| Bron | Status | Gebruik |
|---|---|---|
| [Vakmanprijzen schilder](https://vakmanprijzen.be/schilder) | **Expliciet excl.** €12–33 binnen / €25–45 buiten | **Primary hard** |
| [Schilder-in-de-buurt](https://www.schilder-in-de-buurt.be/prijzen/) | Incl.; zegt dat 6% *kan* gelden bij woning >10j, **niet** dat €20–35 al 6% bevat | Soft. @6%: ≈19–33; @21%: ≈17–29 |

Project-btw via `housingAge` blijft **apart** van de marktbenchmark.

Uren: goed ~0,40 / matig ~0,52 / slecht ~0,72 u/m² (VP mid − mat ÷ €45/u).

---

## 7. Officiële regelgeving

FOD Financiën btw 6%/21% · Vlaanderen MVP i.w.k. 1 maart 2026.
