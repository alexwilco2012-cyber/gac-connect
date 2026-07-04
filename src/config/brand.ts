/**
 * The ONLY place the brand name is written (07_GUARDRAILS §brand exposure).
 * Changing this one constant rebrands the entire site — do not hard-code
 * the brand string anywhere else in src/.
 */
export const BRAND_NAME = 'GAC Connect';

/** The company mark used standalone (wordmark left segment, loader letters). */
export const BRAND_MARK = BRAND_NAME.split(' ')[0] ?? BRAND_NAME;

/** The product segment (wordmark right segment, loader subtitle). */
export const BRAND_PRODUCT = BRAND_NAME.split(' ').slice(1).join(' ') || BRAND_NAME;

export const SITE_TAGLINE = 'Offshore services. Found, vetted, booked.';

export const POC_RIBBON = 'Proof of concept · illustrative data';

export const POC_FOOTER =
  'A proof of concept. All suppliers, vessels, clients, prices, ratings, and figures are illustrative. Not a live service.';
