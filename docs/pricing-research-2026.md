# ELYAN — Belgische renovatieprijzen 2026 (audit-proof)

**Datasetversie:** 2026.3.1-audit7  
**Auditdatum nieuwe 7 categorieën:** 2026-08-10  
**Marktdatum / geraadpleegd:** 9 augustus 2026 (calc1-categorieën); eerdere blokken 7 augustus 2026  
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
| Schrijnwerker / window fitter | 48 | 58 | 68 | marketBenchmark |
| HVAC / heatingTech | 50 | 60 | 70 | marketBenchmark |
| Isolatiespecialist | 42 | 50 | 58 | marketBenchmark |
| Gevelwerker | 45 | 53 | 62 | marketBenchmark |
| Solar installer | 48 | 56 | 65 | marketBenchmark |
| Ventilatietechnicus | 48 | 56 | 65 | marketBenchmark |

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

---

## 8. Ramen & deuren

| Bron | Datum | Regio | BTW | Scope | Eenheid | Range | Soort |
|---|---|---|---|---|---|---|---|
| Vakmanprijzen schrijnwerker | 2026 | BE | excl. | Uurtarieven + soft all-in | €/u, €/m² | soft | marketBenchmark (uren) |
| Bobex ramen | 2026 | BE | **incl.** (consumer) | PVC mat+plaatsing | €/m² | ~350–650 incl. → **@6% ≈ 330–613 excl.** | marketBenchmark (genormaliseerd) |
| Renovatiekampioen / Homedeal | 2026 | BE | unclear / incl. | All-in soft | €/m² · €/raam | soft | softSources |
| Contractor marketing (Bollaert e.a.) | 2026 | BE | excl. claimed | PVC “€700–1050/m²” | €/m² | **niet als primary band** | soft / outlier |

**Modelbanden (excl., ELYAN):** PVC €320–550/m² · aluminium €450–750/m² · hout €400–700/m².  
Schuif uplift 1,45–1,70 op **aandeel** (22%/40%) · buitendeur lump €1400–2800 · uithalen €20–40/m² (other).  
Plaatsingsuren 1,4 / 2,0 / 2,8 u/m² = **modelAssumption** (audit 2026.3.1: was 2,0–3,8 → complex ~€1380/m² te hoog).

---

## 9. Isolatie

| Subtype | All-in excl. | Soort | Scope-nota |
|---|---|---|---|
| Spouw | €15–30/m² | marketBenchmark | Injectie/na-isolatie |
| Dak binnen | €25–50/m² | marketBenchmark | **Enkel isolatie**, geen dakherbouw (→ categorie Dak) |
| Zoldervloer | €20–40/m² | marketBenchmark | — |
| Vloer | €15–40/m² | marketBenchmark | — |
| Binnenmuur | €40–70/m² | marketBenchmark | Incl. basisafwerking soft |
| Buitenmuur + afwerking | €90–160/m² | marketBenchmark | ETICS; **excl. steiger**; finish package **uitgeschakeld** (zit in mat) |

Bronnen: Vakmanprijzen isolatie (excl.); Gevelexpert ETICS €80–140 excl.; Energiesparen soft.  
Componenten mat/uren = **modelAssumption**.

---

## 10. Verwarming

| Projecttype | Band excl. | Soort | Bron |
|---|---|---|---|
| Ketel vervangen | €2800–4500 /project | marketBenchmark | Vakmanprijzen verwarming |
| Lucht-water WP | €7500–14000 /project | marketBenchmark | VP; Bobex soft |
| Hybride | €5500–10000 /project | marketBenchmark | VP |
| Vloerverwarming | €55–95/m² | marketBenchmark | VP |
| Radiatoren package | €1800–4500 /project | modelAssumption | Geschaald op m² |

**Validatie:** LW + vloerverwarming renovatiepakket ~€15–25k excl. blijft realistisch.  
**Waarschuwing:** lucht-water + isolatie=slecht → insights waarschuwen. Geen payback-claims.

---

## 11. Elektriciteit

| Scope | Band excl. | Soort |
|---|---|---|
| Partieel | €25–45/m² | marketBenchmark |
| Volledig / renovatie volledig | **€70–120/m²** | marketBenchmark |
| Nieuw bord | €800–1800 | marketBenchmark |
| Keuring | €120–280 | marketBenchmark |

Bronnen: **Renovatiekampioen** (€70–120/m², 100 m² → €7–12k); Vakmanprijzen; Zonr (€5–15k project soft); Bobex soft.  
Fit-out / floors / uren = **modelAssumption** (audit: complex was ~€167/m² → getrimd naar ~€110–130/m²).

---

## 12. Gevel

| Interventie | Band excl. | Soort |
|---|---|---|
| Reinigen | €8–25/m² | marketBenchmark |
| Voegen | €30–55/m² | marketBenchmark |
| Crepi | €40–70/m² | marketBenchmark |
| Bekleding | €65–120/m² | marketBenchmark |
| Isolatie+afwerking (ETICS) | €90–150/m² | marketBenchmark |

Bronnen: Vakmanprijzen; Gevelexpert (€80–140 crepi-ETICS); Kijzer (€100–150 soft); All-isol / Isolatieprijs soft (€80–250 breed, steenstrips high).  
Steiger middel/hoog = verplichte **other**.  
**Audit:** condition/elevations/finishExtra gestapeld → complex ~€230/m²; uren + factoren gematigd; finishExtra op ETICS ×0,35.

---

## 13. Zonnepanelen

| Post | Band excl. | Soort | Nota |
|---|---|---|---|
| All-in PV | €0,85–1,15/Wp | marketBenchmark | Consumer ~€0,90–1,25 incl@6% |
| Batterij add-on | €4000–7500 | marketBenchmark | Optioneel |
| AREI | €150–250 | marketBenchmark | other |
| Moeilijk dak | +15–25% montage | modelAssumption | — |

**Geen** gegarandeerde besparing of terugverdientijd. Omvormer in PV-materiaalpakket.  
Audit 2026.3.1: banden ongewijzigd (realistisch).

---

## 14. Ventilatie

| Systeem | Band excl. | Soort |
|---|---|---|
| Decentraal | €1200–2800 /project | marketBenchmark |
| Systeem C | €2800–4800 /project | marketBenchmark |
| Systeem D | €5500–9500 /project | marketBenchmark |

Schaling m² + routing-uren = **modelAssumption**. Bronnen: Vakmanprijzen; Bobex soft.  
Audit 2026.3.1: banden ongewijzigd (realistisch).

---

## 15. Audit 2026.3.1 — nieuwe 7 categorieën

| Categorie | Probleem vóór audit | Actie | Status |
|---|---|---|---|
| Ramen | Complex ~€1380/m² (uren + schuif + dagkanten) | Uren ↓, schuif share ↓, reveals ↓ | Herijkt |
| Isolatie buitenmuur | ~€212/m² (finish + ETICS) | Finish package uit voor buitenmuur; mat/uren ↓ | Herijkt |
| Gevel ETICS | ~€230/m² (condition×elevations×finish×uren) | Factoren + uren ↓; finish ×0,35 | Herijkt |
| Elektriciteit | Benchmark te laag (€55–95); complex ~€167/m² | Benchmark €70–120; uren/fit/floors ↓ | Herijkt |
| Verwarming | LW+UFH ~€22k | Geen wijziging (marktconform) | Bevestigd |
| Zonnepanelen | — | Geen wijziging | Bevestigd |
| Ventilatie | — | Geen wijziging | Bevestigd |

**Onaangeroerd:** Badkamer, Keuken, Dak, Vloeren, Schilderwerken (productie-ready).
