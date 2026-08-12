# ELYAN Category Intelligence v1 — QA Checklist

Internal lab only: `/internal/partner-lab`

## Per category (all 12)

| Category | Services | Conditional onboard | Customer Q | Price models | Filters | Profile | No cross-bleed |
|---|---|---|---|---|---|---|---|
| Dakwerken | ☐ | ☐ hellend/plat | ☐ | ☐ | ☐ | ☐ | ☐ |
| Badkamer | ☐ | ☐ coördinatie | ☐ | ☐ | ☐ | ☐ | ☐ |
| Keuken | ☐ | ☐ bedrijfstype/ontwerp | ☐ | ☐ | ☐ | ☐ | ☐ |
| Ramen & deuren | ☐ | ☐ materiaal/beglazing | ☐ | ☐ | ☐ | ☐ | ☐ |
| Isolatie | ☐ | ☐ materialen | ☐ | ☐ | ☐ | ☐ | ☐ |
| Verwarming | ☐ | ☐ systemen | ☐ | ☐ | ☐ | ☐ | ☐ |
| Elektriciteit | ☐ | ☐ AREI note | ☐ | ☐ | ☐ | ☐ | ☐ |
| Gevel | ☐ | ☐ finishes | ☐ | ☐ | ☐ | ☐ | ☐ |
| Vloeren | ☐ | ☐ floors | ☐ | ☐ | ☐ | ☐ | ☐ |
| Schilderwerken | ☐ | ☐ | ☐ ondergrondstaat | ☐ | ☐ | ☐ | ☐ |
| Ventilatie | ☐ | ☐ systems | ☐ | ☐ | ☐ | ☐ | ☐ |
| Zonnepanelen | ☐ | ☐ daktypes + no claims | ☐ | ☐ | ☐ | ☐ | ☐ |

## Shared services (same ID, no duplicate truth)

- [ ] `roof_insulation` — dakwerken + isolatie
- [ ] `external_wall_insulation` — gevel + isolatie
- [ ] `floor_insulation` — vloeren + isolatie
- [ ] `underfloor_heating` — verwarming + vloeren (+ badkamer ref)
- [ ] `electrical_installation` — elektriciteit + zonnepanelen (+ badkamer/keuken ref)
- [ ] `ventilation` — ventilatie (+ badkamer ref)
- [ ] `ev_charging` — elektriciteit + zonnepanelen

## Flows

- [ ] Onboarding empty start (placeholders only)
- [ ] Category switch resets subtypes
- [ ] Back/forward keeps form state
- [ ] Availability month picker + capacity + visit options
- [ ] Google Ja/Nee/Niet zeker + consent
- [ ] Success: BEDANKT / status flow
- [ ] Quote category-specific details + “Ik weet het niet”
- [ ] Interest → `interested` + customer notice
- [ ] Decline → reason enum
- [ ] No generic public “Praktisch” dump
- [ ] Public routes untouched (homepage, Calc1/2, /partners)

## Responsive

- [ ] Desktop
- [ ] Laptop
- [ ] Tablet
- [ ] Mobile
- [ ] No console errors
