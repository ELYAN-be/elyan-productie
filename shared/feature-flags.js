/**
 * Launch feature flags — keep product code, hide from public surfaces.
 * Flip flags to true to restore public PDF delivery / calculators.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ElyanFeatureFlags = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  return {
    /** When false: no public PDF report UI; send-report APIs refuse generation/email. */
    PUBLIC_PDF_REPORTS_ENABLED: false,
    /** When false: no public calculator CTAs, chooser page, or deep-link openers. */
    PUBLIC_CALCULATORS_ENABLED: false
  };
});
