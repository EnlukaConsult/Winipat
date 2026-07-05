// Nigerian bank list + CBN/NIP codes for Pandascrow NUBAN lookups.
//
// The doc's NUBAN example uses a 3-digit CBN code (bank_code=044), so these are
// the standard CBN codes. Fintech wallets (OPay/PalmPay) use longer NIP codes
// and may or may not be resolvable via Pandascrow — confirm against /bank/lists.
// `name` must stay identical to the values stored in bank_accounts.bank_name so
// we can map a saved account to its code server-side.

export type NigerianBank = { name: string; code: string };

export const NIGERIAN_BANKS: NigerianBank[] = [
  { name: "Access Bank", code: "044" },
  { name: "Citibank Nigeria", code: "023" },
  { name: "Ecobank Nigeria", code: "050" },
  { name: "First City Monument Bank (FCMB)", code: "214" },
  { name: "Fidelity Bank", code: "070" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "Guaranty Trust Bank (GTBank)", code: "058" },
  { name: "Heritage Bank", code: "030" },
  { name: "Keystone Bank", code: "082" },
  { name: "OPay", code: "100004" }, // Paycom(opay) — confirmed via /bank/lists
  { name: "PalmPay", code: "100033" }, // confirmed via /bank/lists
  { name: "Polaris Bank", code: "076" },
  { name: "Providus Bank", code: "101" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "Sterling Bank", code: "232" },
  { name: "United Bank for Africa (UBA)", code: "033" },
  { name: "Union Bank of Nigeria", code: "032" },
  { name: "Unity Bank", code: "215" },
  { name: "Wema Bank", code: "035" },
  { name: "Zenith Bank", code: "057" },
];

// Options for the onboarding dropdown (value === name, kept for the existing
// form which stores the bank name).
export const NIGERIAN_BANK_OPTIONS = NIGERIAN_BANKS.map((b) => ({
  value: b.name,
  label: b.name,
}));

const NAME_TO_CODE = new Map(NIGERIAN_BANKS.map((b) => [b.name, b.code]));

export function bankCodeForName(name: string | null | undefined): string | null {
  if (!name) return null;
  return NAME_TO_CODE.get(name) ?? null;
}
