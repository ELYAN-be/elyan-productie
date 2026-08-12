# ELYAN Vakmannen — Category research notes

Internal documentation for the 12 category domain models in `categories.js`.

## Method
- Align subtypes with Belgian/Flemish contractor practice and ELYAN Calculator 1 packaging.
- Prefer structured units over fake precision.
- Where market ranges vary widely: partner-supplied ranges or `on_request` / `after_visit`.
- Indicative market ballparks below are **not** ELYAN quotes and are **not** shown as product truth without partner data.

## Category summaries

| Category | Typical units | Notes |
|---|---|---|
| Dakwerken | €/m², vanaf, €/lm | Golden standard. Isolatie & renovatie m²; herstelling vanaf; goten lm. |
| Badkamer | project / vanaf / €/m² tegels | Full baths usually forfait (€3.5k–€25k market band). |
| Keuken | project / lm werkblad | Placement-only vs full kitchen differ strongly. |
| Ramen & deuren | €/stuk, €/m² glas | PVC/ALU/hout + glazing matter. |
| Isolatie | €/m² | Method-dependent (spouw vs buiten vs dak). |
| Verwarming | package / vanaf / €/m² vloerverwarming | Warmtepomp strongly after-visit. |
| Elektriciteit | uur / forfait / project | Keuring BE-specific. |
| Gevel | €/m² | Crepi/isolatie/steenstrips. |
| Vloeren | €/m², €/lm plinten | Chape separate from finish. |
| Schilderwerken | €/m², uur | Interior often project forfait. |
| Ventilatie | package | C/D strongly site-dependent. |
| Zonnepanelen | €/Wp or package | Orientation/shade → after visit. |

## Assumptions flagged
1. Exact partner price bands come from onboarding, not from marketing blogs.
2. “ELYAN marktindicatie” vs partner price must stay separate if both ever shown.
3. Full Belgian postcode dataset still TODO (current index is curated).
4. Google Places live connector still TODO.
