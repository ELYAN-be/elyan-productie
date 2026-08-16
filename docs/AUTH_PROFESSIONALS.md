# ELYAN for Professionals — Auth configuration checklist

Do not put secrets in this file. Compare production settings only by name/presence.

## Required Vercel env (Production)

| Name | Purpose |
|------|---------|
| `SUPABASE_URL` | Auth + DB API origin |
| `SUPABASE_ANON_KEY` | Browser client via `/api/professionals?action=public-config` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only password setup + invites (never in browser) |
| `PROFESSIONALS_APP_URL` | Absolute origin for invite links (`https://www.elyan.be`) |
| `RESEND_API_KEY` | Invite email delivery |

## Supabase Dashboard (Authentication)

Site URL:
- `https://www.elyan.be`

Redirect URLs allowlist (must include):
- `https://www.elyan.be/professionals/reset-password`
- `https://www.elyan.be/professionals/reset-password/**`
- `https://www.elyan.be/**` (or explicit paths above)

Notes:
- Invite password links use `/professionals/set-password/<elyan_token>` and set the password
  via `POST /api/professionals?action=setup-password` (no Supabase OTP in the email).
- Forgot-password uses Supabase `resetPasswordForEmail` with
  `redirectTo = {origin}/professionals/reset-password` (PKCE / hash session).
- Localhost redirects are optional for local testing only; production must not depend on them.

## DB grants (service_role)

Phase A BFF (`createAdminClient`) needs table GRANTs on:
`profiles`, `partners`, `partner_members`, `partner_invites` (SELECT/INSERT/UPDATE),
`staff_users` (SELECT), `audit_logs` (INSERT). Captured in
`20260814_phase_a_foundation.sql` and re-applied idempotently by
`20260815_service_role_grants.sql` for DBs that missed them.

Phase B onboarding BFF additionally needs SELECT/INSERT/UPDATE on:
`partner_onboarding`, `partner_profiles`, `partner_profile_assets`, `partner_review_items`
(`20260816_phase_b_onboarding_foundation.sql`, repair in
`20260816_phase_b_service_role_grants.sql`). Authenticated may SELECT those
tables via RLS (active membership); writes remain BFF/service_role only.

Do not grant invite/membership writes to `anon` or `authenticated`.
The BFF still has Auth `app_metadata` fallback if table GRANTs are incomplete.
