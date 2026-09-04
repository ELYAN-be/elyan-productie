# ELYAN Cookie & Storage Inventory

**Updated:** September 2026 (SEO + analytics sprint)  
**Scope:** Current production implementation only.

---

## Summary

| Question | Answer |
|----------|--------|
| Vercel Web Analytics client tracking active | **NO** (scripts removed) |
| Vercel Speed Insights client tracking active | **NO** (scripts removed) |
| Custom analytics cookies | **NO** |
| Custom analytics localStorage | **NO** |
| Custom analytics persistent ID | **NO** |
| Non-essential client trackers active | **NO** |
| Cookie banner required | **NO** |
| Recheck after future analytics changes | **YES** |

---

## Inventory

### 1. Supabase Auth Session (Professionals only)

| Field | Value |
|-------|-------|
| **Name** | Supabase auth session (`sb-*-auth-token` pattern) |
| **Type** | Authentication |
| **Provider** | Supabase |
| **Purpose** | Professional login on `/professionals/*` |
| **Storage** | localStorage via `@supabase/supabase-js` |
| **Strictly necessary** | YES |
| **Consent required** | NO |
| **Source** | `js/professionals/core.js` |

### 2. ELYAN Aggregate Analytics (client)

| Field | Value |
|-------|-------|
| **Name** | ElyanAnalytics |
| **Type** | Anonymous product counters |
| **Provider** | ELYAN (first-party API) |
| **Purpose** | Funnel counts (calculator, marketplace, requests) |
| **Storage** | None in browser; in-memory dedupe keys only (`js/analytics.js`) |
| **Server storage** | `analytics_daily_counts` aggregate table |
| **Cookies** | NO |
| **localStorage** | NO |
| **IP persisted in analytics** | NO |
| **Source** | `js/analytics.js`, `api/analytics.js`, `server/analytics.js` |

### 3. Calculator in-browser state

| Field | Value |
|-------|-------|
| **Type** | Transient UX state |
| **Storage** | JavaScript memory until page unload |
| **Strictly necessary** | YES (functional) |

---

## Disabled / removed

- Vercel Web Analytics (`/_vercel/insights/script.js`) — **removed from all public HTML**
- Vercel Speed Insights (`/_vercel/speed-insights/script.js`) — **removed from all public HTML**
- Google Analytics, Meta Pixel, session replay — **not present**

---

## RETENTION (launch)

Policy aligned in `privacybeleid.html` §9 and `server/retention.js`.  
Weekly cron: `GET /api/cron/retention` (Bearer `CRON_SECRET`), **dry-run by default**.  
Apply only with `RETENTION_APPLY=true` (+ CLI `CONFIRM_RETENTION_APPLY=YES`).  
Migration: `supabase/migrations/20260904_retention_policy.sql` (holds + DELETE grants).  
Analytics aggregates (`analytics_daily_counts`): 36 months; no user identifiers.

---

## ANALYTICS COOKIE INVENTORY MUST BE RECHECKED AFTER ANALYTICS IMPLEMENTATION

Completed for custom aggregate analytics (September 2026). Recheck if new client trackers or marketing stack added.
