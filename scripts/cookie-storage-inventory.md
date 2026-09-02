# ELYAN Cookie & Storage Inventory

**Generated:** September 2026 (launch-readiness legal sprint)  
**Scope:** Current production implementation only — no invented cookie names or lifetimes.

> **ANALYTICS COOKIE INVENTORY MUST BE RECHECKED AFTER ANALYTICS IMPLEMENTATION.**

---

## Summary

| Question | Answer |
|----------|--------|
| Non-essential trackers firing before consent? | **NO** (no marketing/analytics cookies requiring consent today) |
| Cookie banner required now? | **NO** |
| Consent required for current stack? | **NO** (except partner interest checkbox for processing onboarding application — separate from cookie consent) |
| Recheck after analytics sprint? | **YES** |

---

## Inventory

### 1. Vercel Web Analytics

| Field | Value |
|-------|-------|
| **Name** | Vercel Web Analytics (cookieless) |
| **Type** | Pageview / visit statistics |
| **Provider** | Vercel |
| **Purpose** | Aggregate traffic measurement, no ad profiling |
| **Storage mechanism** | No tracking cookies; hashed visitor id server-side (~24h per Vercel docs) |
| **Lifetime** | Per Vercel retention policy — not verified in repo |
| **Strictly necessary** | NO (statistics) — but cookieless / no consent banner required per current ELYAN assessment |
| **Consent required (likely)** | NO at current implementation |
| **Source** | `index.html`, legal pages: `/_vercel/insights/script.js` |

### 2. Vercel Speed Insights

| Field | Value |
|-------|-------|
| **Name** | Vercel Speed Insights |
| **Type** | Performance monitoring |
| **Provider** | Vercel |
| **Purpose** | Core Web Vitals / load performance |
| **Storage mechanism** | Cookieless script |
| **Lifetime** | Per Vercel — not verified in repo |
| **Strictly necessary** | NO |
| **Consent required (likely)** | NO at current implementation |
| **Source** | `index.html`, legal pages: `/_vercel/speed-insights/script.js` |

### 3. Supabase Auth Session (Professionals only)

| Field | Value |
|-------|-------|
| **Name** | Supabase auth session (localStorage key pattern `sb-*-auth-token`) |
| **Type** | Authentication / session |
| **Provider** | Supabase |
| **Purpose** | Professional login, session refresh, PKCE auth flow |
| **Storage mechanism** | `localStorage` via `@supabase/supabase-js` (`persistSession: true`) |
| **Lifetime** | Session / refresh token TTL managed by Supabase — exact cookie names not hardcoded in ELYAN repo |
| **Strictly necessary** | YES (for professional account access) |
| **Consent required (likely)** | NO (strictly necessary for requested service) |
| **Source** | `js/professionals/core.js` — `/professionals/*` routes only |

### 4. Calculator in-browser state

| Field | Value |
|-------|-------|
| **Name** | In-memory / transient DOM state |
| **Type** | UX progress (not persisted server-side from browser storage in main calc flow) |
| **Provider** | ELYAN (client-side) |
| **Purpose** | Step progress during calculator session |
| **Storage mechanism** | JavaScript memory; no verified persistent localStorage for main consumer calc |
| **Lifetime** | Until page unload |
| **Strictly necessary** | YES (functional) |
| **Consent required (likely)** | NO |
| **Source** | Calculator overlay in `index.html` / `js/calculator2.js` |

---

## Not present (verified absent in repo)

- Google Analytics / GA4
- Meta Pixel / Facebook tracking
- Hotjar / Clarity / full-session replay SDKs
- Tag Manager with marketing tags
- Advertising cookies
- Public cookie consent banner component
- `document.cookie` usage in application JS (grep: no matches in app code)

---

## Server-side (not browser cookies)

| Item | Purpose | Source |
|------|---------|--------|
| HTTP access logs | Security, rate limiting | Vercel / `server/rate-limit.js` |
| Rate limit counters | Abuse prevention | In-memory / server-side |
| Database records | Platform data | Supabase |

Retention for server/database categories: **NO DEFINED AUTOMATED RETENTION** — see `LEGAL_IDENTITY_PENDING.md` / privacy policy section 9.

---

## Processors (storage-related)

| Provider | Role | Evidence |
|----------|------|----------|
| Vercel | Hosting, analytics scripts, public blob CDN | `vercel.json`, `server/blob-storage.js` |
| Supabase | DB + auth | `server/supabase.js` |
| Vercel Blob | Portfolio assets (public + private tokens) | `server/blob-storage.js` |
| Resend | Email (not cookie) | `server/partner-autopilot-emails.js` |

International transfer safeguards: **TRANSFER SAFEGUARDS TO CONFIRM**

---

## RETENTION DECISIONS REQUIRED

Categories without defined + enforced automated deletion:

1. Interest / customer request records (`interest_intakes`, customer requests)
2. Calculator report / email submission data
3. Professional accounts, onboarding drafts, profiles
4. Portfolio assets (public + private blob)
5. Audit / Control history logs
6. Security / rate-limit logs

Do not invent retention periods until business/legal decision is made.
