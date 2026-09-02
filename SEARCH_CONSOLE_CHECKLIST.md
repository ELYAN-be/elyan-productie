# Google Search Console — Manual Checklist (INTERNAL)

**Status:** SEARCH CONSOLE DOMAIN VERIFICATION: **PENDING**

1. Add **Domain property** for `elyan.be` in Google Search Console
2. Verify via **DNS TXT record** (recommended) or HTML file if already configured
3. Submit sitemap: `https://www.elyan.be/sitemap.xml`
4. URL Inspection — confirm indexed:
   - `https://www.elyan.be/`
   - `https://www.elyan.be/prijs-berekenen`
   - `https://www.elyan.be/vakmannen`
5. Confirm **noindex** pages stay excluded:
   - `/professionals/*`
   - `/vakmannen/p/*/aanvraag`
   - marketplace URLs with `?postcode=` / `?gemeente=` filters
6. Monitor Coverage report after 1–2 weeks

**Note:** Legal identity completion (`LEGAL_IDENTITY_PENDING.md`) remains separate from Search Console setup.
