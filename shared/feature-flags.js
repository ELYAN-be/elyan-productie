/**
 * Launch feature flags — keep PDF report code, hide from public product.
 * Flip PUBLIC_PDF_REPORTS_ENABLED to true to restore email/PDF delivery.
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
    PUBLIC_PDF_REPORTS_ENABLED: false
  };
});
