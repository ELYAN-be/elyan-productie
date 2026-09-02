# ELYAN Analytics Events Contract

**Updated:** September 2026  
**Principle:** Measure the product without tracking people.

---

## Identity & storage (client)

- **No cookies** for analytics
- **No localStorage** analytics identifier
- **No sessionStorage** analytics identifier
- **No session ID**, user ID, account ID, or fingerprint
- **No persistent browser identifier**
- Client deduplication uses a **page-runtime in-memory object only** (`js/analytics.js` → `fired` map). It resets on full page reload/navigation; it is not a session tracker.

---

## Storage model (server)

- Table: `analytics_daily_counts`
- One row per `(event_date UTC, event_name, dimension_1, dimension_2)` with atomic `count` increment via RPC
- **No raw event rows**, no PII, no IP persisted in analytics

---

## Allowed events

| Event | Meaning | Trigger | dimension_1 | dimension_2 | Forbidden |
|-------|---------|---------|-------------|-------------|-----------|
| `landing_view` | Public acquisition page viewed | Once per page load | `surface`: home, calculator_chooser, marketplace, partner | — | URL, referrer |
| `calculator_selected` | User chose calc1 or calc2 | Click on calculator entry | `calculator`: calc1, calc2 | `surface` (optional) | category free text |
| `calculator_started` | Calculator overlay opened | Once per page/runtime instance (in-memory dedupe) | `calculator` | `surface` (optional) | answers |
| `calculator_completed` | Calculator reached results/review | Once per run (in-memory dedupe) | `calculator` | — | totals, email |
| `report_requested` | Report email sent successfully | **Server** after Resend OK | `calculator` | — | email, PDF content |
| `marketplace_search` | Search/filter executed | Form submit | `category` or `all` | — | postcode, query text |
| `profile_opened` | Public profile viewed | Profile API success | `category` or `all` | — | slug, partner ID |
| `request_started` | Targeted request form ready | **Only** when `/vakmannen/p/{slug}/aanvraag` intake form is loaded and ready (not profile CTA click) | `surface`: marketplace | — | partner slug |
| `request_submitted` | Customer request persisted | **Server** after intake + request created | `category` or `all` | — | name, email, phone |
| `partner_interest_submitted` | New partner interest stored | **Server** after new candidate created | `category` or `all` | — | company, email |

---

## Canonical categories (dimension_1 when type=category)

`dakwerken`, `badkamer`, `keuken`, `ramen-deuren`, `isolatie`, `verwarming`, `elektriciteit`, `gevel`, `vloeren`, `schilderwerken`, `ventilatie`, `zonnepanelen`, or `all`

---

## Endpoint

`POST /api/analytics` — strict JSON, max 512 bytes, allowlisted fields only: `event`, `surface`, `calculator`, `category`

---

## Recheck marker

Recheck cookie/storage inventory if new client trackers are added.
