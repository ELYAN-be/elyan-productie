/* ============================================================
   ELYAN Calc2 Investor. Documented financial parameters (2026)
   sourceType: OFFICIAL_REGULATION | MARKET_BENCHMARK | MODEL_ASSUMPTION | USER_ASSUMPTION
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanCalc2InvestorResearch = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var AUDIT_DATE = '2026-08-10';

  var PARAMETERS = [
    {
      id: 'reg_flanders_investor',
      jurisdiction: 'Vlaanderen',
      label: 'Verkooprecht standaard / investering',
      formula: '12% × aankoopprijs',
      applicability: 'Niet-enige eigen gezinswoning; vennootschap; tweede woning; flip-investor default',
      vatTaxStatus: 'Registratiebelasting (geen btw)',
      confidence: 'high',
      sourceType: 'OFFICIAL_REGULATION',
      source: 'Vlaanderen.be, verkooprecht',
      url: 'https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/registratiebelasting/verkooprecht',
      date: AUDIT_DATE
    },
    {
      id: 'reg_flanders_owner',
      jurisdiction: 'Vlaanderen',
      label: 'Verkooprecht enige eigen woning',
      formula: '2% × aankoopprijs (strikte voorwaarden; aangescherpt 2026)',
      applicability: 'Natuurlijk persoon, volle eigendom, enige woning, domiciliëring. NIET default investor flip',
      vatTaxStatus: 'Registratiebelasting',
      confidence: 'high',
      sourceType: 'OFFICIAL_REGULATION',
      source: 'Andersen / Vlabel commentary 2026',
      url: 'https://be.andersen.com/en/news-belgium/purchase-of-a-sole-and-principal-residence-in-flanders-stricter-conditions-for-the-2-registration-duty-as-of-1-january-2026',
      date: AUDIT_DATE
    },
    {
      id: 'reg_brussels',
      jurisdiction: 'Brussel',
      label: 'Registratierecht',
      formula: '12,5% × aankoopprijs',
      applicability: 'Standaard; abattement €200k vooral eerste eigen woning, niet auto voor investor',
      vatTaxStatus: 'Registratierecht',
      confidence: 'high',
      sourceType: 'OFFICIAL_REGULATION',
      source: 'be.brussels registratierechten',
      url: 'https://be.brussels/nl/belastingen-financien/belastingen/belastingen-op-onroerend-goed/registratierechten',
      date: AUDIT_DATE
    },
    {
      id: 'reg_wallonia_investor',
      jurisdiction: 'Wallonië',
      label: 'Droits d\'enregistrement investering',
      formula: '12,5% × aankoopprijs',
      applicability: 'Niet-enige eigen woning / investering',
      vatTaxStatus: 'Registratierecht',
      confidence: 'high',
      sourceType: 'OFFICIAL_REGULATION',
      source: 'Waalse hervorming 2025. 3% enkel eigen+enige; anders 12,5%',
      url: 'https://www.grantthornton.be/en/the-field/articles-and-publications/Direct-tax/real-estate-taxes-in-belgium-in-2026-what-property-ownership-really-costs/',
      date: AUDIT_DATE
    },
    {
      id: 'reg_wallonia_owner',
      jurisdiction: 'Wallonië',
      label: 'Droits d\'enregistrement enige eigen woning',
      formula: '3% (voorwaarden)',
      applicability: 'Enige eigen woning, niet default flip',
      vatTaxStatus: 'Registratierecht',
      confidence: 'high',
      sourceType: 'OFFICIAL_REGULATION',
      source: 'Grant Thornton / housing summaries 2025-2026',
      url: 'https://www.grantthornton.be/en/the-field/articles-and-publications/Direct-tax/real-estate-taxes-in-belgium-in-2026-what-property-ownership-really-costs/',
      date: AUDIT_DATE
    },
    {
      id: 'notary_ereloon',
      jurisdiction: 'België',
      label: 'Notaris ereloon aankoop',
      formula: 'Degressief wettelijk barema (vereenvoudigd model) + admin €650–1250 + 21% btw',
      applicability: 'Alle regio\'s; override aangeraden',
      vatTaxStatus: '21% btw op ereloon/admin',
      confidence: 'medium',
      sourceType: 'MODEL_ASSUMPTION',
      source: 'Belgisch notarieel barema (schets) + marktband admin',
      url: null,
      date: AUDIT_DATE
    },
    {
      id: 'mortgage_deed',
      jurisdiction: 'België',
      label: 'Hypotheekakte / registratie',
      formula: '~1% op leenbedrag + deel notaris, model',
      applicability: 'Alleen bij financiering',
      vatTaxStatus: 'Gemengd',
      confidence: 'low',
      sourceType: 'MODEL_ASSUMPTION',
      source: 'Vereenvoudigde marktindicatie',
      url: null,
      date: AUDIT_DATE
    },
    {
      id: 'reno_vat_works',
      jurisdiction: 'België',
      label: 'BTW renovatiewerken',
      formula: 'Vaak 6% onder voorwaarden (woning >10j, privé); anders 21%',
      applicability: 'Feitenafhankelijk, finance layer: expected 6% / conservative 21%',
      vatTaxStatus: 'BTW',
      confidence: 'medium',
      sourceType: 'MODEL_ASSUMPTION',
      source: 'FOD Financiën renovatie-btw (gebruiker moet bevestigen)',
      url: 'https://financien.belgium.be/',
      date: AUDIT_DATE
    },
    {
      id: 'agent_commission',
      jurisdiction: 'België',
      label: 'Makelaarscommissie',
      formula: '2–4% excl. 21% btw (vrij onderhandelbaar; BIV geen tarief)',
      applicability: 'Alleen bij verkoop via makelaar',
      vatTaxStatus: '21% btw op commissie',
      confidence: 'medium',
      sourceType: 'MARKET_BENCHMARK',
      source: 'BIV (geen vast tarief) + marktband 2026',
      url: 'https://www.biv.be/kb/het-beroep/tarieven-en-erelonen/het-ereloon-van-de-vastgoedmakelaar',
      date: AUDIT_DATE
    },
    {
      id: 'profit_tax',
      jurisdiction: 'België',
      label: 'Belasting op meerwaarde / beroepsinkomen',
      formula: 'NIET automatisch berekend',
      applicability: 'Hangt af van privé/vennootschap, timing, speculatief karakter',
      vatTaxStatus: 'Inkomstenbelasting / vennootschapsbelasting. UNRESOLVED',
      confidence: 'low',
      sourceType: 'UNRESOLVED',
      source: 'Te complex zonder feiten, disclosure only',
      url: null,
      date: AUDIT_DATE
    }
  ];

  return {
    AUDIT_DATE: AUDIT_DATE,
    PARAMETERS: PARAMETERS
  };
});
