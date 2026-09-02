# ELYAN Pricing Phase B — Evidence Ledger

Belgium / Flanders · 2026 context · Retrieved 2026-09-02

---

## VAT — Fossil heating (IMPLEMENTED)

| Field | Value |
|-------|-------|
| **CURRENT** | Single `vatScenario(housingAge)` rate on entire excl-VAT subtotal for all categories |
| **CURRENT SOURCE** | `shared/pricing.js` `vatScenario()` |
| **EXTERNAL SOURCE 1** | [FOD Financiën — Gewijzigde btw-tarieven verwarmingsinstallaties fossiele brandstoffen](https://fin.belgium.be/nl/particulieren/woning/bouwen-verbouwen/verbouwen/gewijzigde-btw-tarieven-verwarmingsinstallaties-fossiele-brandstoffen) |
| **EXTERNAL SOURCE 2** | Circulaire 2025/C/47 (cited by FOD Financiën) |
| **NORMALIZED COMPARISON** | From 29.07.2025: fossil-specific boiler parts + their labour → 21%; non-specific distribution (UFH, radiators, pipes) → 6% if renovation conditions met; hybrid global price → 35% at 21% / 65% at 6% (FOD simplified allocation) |
| **DECISION** | **VAT RULE CHANGE** |
| **PROPOSED** | Package-level `vatClass` on verwarming work packages; `computeVatAmounts()` with `vatBreakdown` |
| **RATIONALE** | Phase A correctly flagged coarse 6% on entire fossil boiler replacement as incorrect under current Belgian law |
| **CONFIDENCE** | **High** (official government source) |

### Kitchen VAT

| Field | Value |
|-------|-------|
| **CURRENT** | Same single-rate renovation VAT as other categories |
| **EXTERNAL SOURCE** | FOD Financiën renovation rubric XXXI (general works); no clear package-level split for kitchen cabinets vs appliances in current question model |
| **DECISION** | **KEEP** — no CODE FIX; insufficient official mapping to existing packages |
| **CONFIDENCE** | Medium (no change attempted) |

---

## VENTILATIE — KEEP

| Field | Value |
|-------|-------|
| **CURRENT TYPICAL** | System C 120 m², 2 floors, renovatie routing: **€5,550** excl. (range €3,300–€8,700) |
| **CURRENT BARE** | System C 120 m², 1 floor, eenvoudig: **€4,150** excl. (within benchmark €2,800–€4,800) |
| **CURRENT SOURCE** | `MARKET.ventilation` in `market-data-2026.js` |
| **EXTERNAL SOURCE 1** | Vakmanprijzen.be ventilatie — System C €2.8–4.8k excl. (primary benchmark in data) |
| **EXTERNAL SOURCE 2** | Livios.be — type C ~€3,250 installed |
| **EXTERNAL SOURCE 3** | Renovatiekampioen.be — System C €1,500–3,000 (lower scope/smaller installs) |
| **NORMALIZED COMPARISON** | Bare engine scenario lands mid-upper benchmark; TYPICAL adds renovatie routing + extra floors/wet rooms → justified uplift above bare band |
| **DECISION** | **KEEP** |
| **CONFIDENCE** | Medium-high (2+ BE signals; typical complexity modifiers explain upper band) |

---

## SCHILDERWERKEN — KEEP

| Field | Value |
|-------|-------|
| **CURRENT TYPICAL** | 100 m² binnen matig: **€3,750** excl. (~€37.5/m²) |
| **darkColors uplift** | +€900 (+24%) on identical scenario |
| **CURRENT SOURCE** | `paintMaterial` ×1.25 + `darkColorExtraMat/Hours` packages |
| **EXTERNAL SOURCE 1** | Vakmanprijzen.be — binnen €12–33/m² excl. mat+2 lagen |
| **EXTERNAL SOURCE 2** | Renovatiekampioen.be — binnen €25–45/m² incl. prep (100 m² → €2,500–4,500) |
| **NORMALIZED COMPARISON** | €37.5/m² at matig surface within VP upper band; dark color +24% aligns with RK note on extra coats for premium/dark colors |
| **DECISION** | **KEEP** (darkColors stacking not proven overstated) |
| **CONFIDENCE** | Medium |

---

## KEUKEN — KEEP

| Field | Value |
|-------|-------|
| **CURRENT** | fronten €6,250 · vervangen €16,850 · herindelen €39,800 |
| **CURRENT SOURCE** | `cabinetsPerM2`, `fitHours`, modelAssumption bands |
| **EXTERNAL SOURCE 1** | Tipsentricks.be — nieuwe keuken €10–25k excl. |
| **EXTERNAL SOURCE 2** | Alkeba.be — keukenprijs BE (soft corroboration) |
| **NORMALIZED COMPARISON** | Vervangen 12 m² mid → €16,850 within €10–25k; premium herindelen high but structurally explained (hoog cabinets, uitgebreid appliances, connections) |
| **DECISION** | **KEEP** |
| **CONFIDENCE** | Medium (component bands remain modelAssumption but totals align) |

---

## BADKAMER COMPLEX — KEEP

| Field | Value |
|-------|-------|
| **CURRENT COMPLEX** | 10 m² premium: **€24,350** exp (high **€41,800**) |
| **High driver** | Premium sanitary beide (shower €2,350 + bath €2,610) + full tiling (€3,650) + plumbing move (€3,600) + UFH (€2,180) — all legitimate premium scope |
| **EXTERNAL SOURCE 1** | Badkamer-advies.be — luxe volledig €12.5–25k excl. (~8 m² reference) |
| **EXTERNAL SOURCE 2** | Engine component sum exceeds BA luxe band at premium+all options → high band reflects uncertainty, not single overstated coefficient |
| **DECISION** | **KEEP** — high €41,800 is valid uncertainty envelope for extreme premium scope |
| **CONFIDENCE** | Medium-high |

---

## Protected areas (unchanged)

- Dak, gevel, ramen, isolatie, vloeren, elektriciteit, PV €/Wp base pricing
- Province multipliers, global €500 minimum, contingency architecture
- Calculator 2 package reuse path

---

## Market-data version

**No market-data price changes in Phase B.** Version remains `2026.3.1-audit7`.
