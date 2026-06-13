// Mask PII (phone numbers, emails, links, social handles) in buyer <-> seller
// messages. (FR-BYR-050 / 052 / 053)
//
// The AUTHORITATIVE masking lives in the database (migration
// 014_mask_message_pii.sql) — a BEFORE INSERT/UPDATE trigger on `messages`
// — because messages are written client-side and that trigger is the one
// chokepoint every write passes through.
//
// This module mirrors those rules in TypeScript for two reasons:
//   1. Display-time defense-in-depth — covers any historical rows written
//      before the migration ran, and any future read path.
//   2. UX — `containsPii()` powers a live "your contact details will be
//      hidden" hint so a sender isn't surprised when their number is stripped.
//
// Keep the patterns here in sync with migration 014. Order matters: emails
// and URLs are consumed before the phone pass so digit-bearing URLs aren't
// half-masked.

const HIDDEN = "[hidden]";

const PII_PATTERNS: ReadonlyArray<RegExp> = [
  // 1) Email addresses
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gi,
  // 2) URLs with an explicit scheme or www.
  /(?:https?:\/\/|www\.)\S+/gi,
  // 3) Bare domains ending in a common TLD
  /[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.(?:com|net|org|ng|io|co|me|app|store|info|biz|online|shop|link|xyz|gg)(?:\/\S*)?/gi,
  // 4) Phone numbers: optional +, then digits/spaces/dashes/dots/parens,
  //    ~9+ digits total. Commas and ₦ are excluded so prices survive.
  /\+?\d[\d\s().-]{7,}\d/g,
  // 5) Social / messaging handles (@username)
  /@[A-Za-z0-9_.]{3,}/g,
];

/**
 * Replace any phone numbers, emails, links or @handles in `input` with
 * "[hidden]". Safe on null/undefined (returns "").
 */
export function maskPii(input: string | null | undefined): string {
  if (!input) return "";
  let out = input;
  for (const pattern of PII_PATTERNS) {
    out = out.replace(pattern, HIDDEN);
  }
  return out;
}

/**
 * True if `input` contains anything `maskPii` would strip. Used to show a
 * live hint to the sender before they send.
 */
export function containsPii(input: string | null | undefined): boolean {
  if (!input) return false;
  return maskPii(input) !== input;
}
