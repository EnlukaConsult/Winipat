// One-off NUBAN test: node scripts/test-nuban.mjs <account_number> "<Bank Name>" "<Expected Name>"
// Reads the Pandascrow sandbox key from .env.local. Billed per call.
import fs from "node:fs";

const raw = fs.readFileSync(".env.local", "utf8");
const get = (n) => {
  const l = raw.split(/\r?\n/).find((l) => l.match(new RegExp("^\\s*" + n + "\\s*=")));
  return l ? l.split("=").slice(1).join("=").trim() : null;
};

// Bank name -> CBN/Pandascrow code (mirror of src/lib/nigeria-banks.ts).
const BANKS = {
  "Access Bank": "044", "Citibank Nigeria": "023", "Ecobank Nigeria": "050",
  "First City Monument Bank (FCMB)": "214", "Fidelity Bank": "070",
  "First Bank of Nigeria": "011", "Guaranty Trust Bank (GTBank)": "058",
  "Heritage Bank": "030", "Keystone Bank": "082", "OPay": "100004",
  "PalmPay": "100033", "Polaris Bank": "076", "Providus Bank": "101",
  "Stanbic IBTC Bank": "221", "Sterling Bank": "232",
  "United Bank for Africa (UBA)": "033", "Union Bank of Nigeria": "032",
  "Unity Bank": "215", "Wema Bank": "035", "Zenith Bank": "057",
};

const [acct, bankName, expected] = process.argv.slice(2);
if (!acct || !bankName) {
  console.log('Usage: node scripts/test-nuban.mjs <account_number> "<Bank Name>" ["<Expected Name>"]');
  console.log("Banks:", Object.keys(BANKS).join(", "));
  process.exit(1);
}
// Accept either an exact bank name or a fuzzy substring, else a raw 3-6 digit code.
let code = BANKS[bankName];
if (!code) {
  const hit = Object.entries(BANKS).find(([n]) => n.toLowerCase().includes(bankName.toLowerCase()));
  code = hit ? hit[1] : (/^\d{3,6}$/.test(bankName) ? bankName : null);
}
if (!code) { console.log("No bank_code for", JSON.stringify(bankName)); process.exit(1); }

const BASE = get("PANDASCROW_BASE_URL").replace(/\/$/, "");
const KEY = get("PANDASCROW_API_KEY");

function extractName(r) {
  const data = r.data ?? r;
  const d = data.entity ?? data;
  return d.account_name || d.name || d.full_name ||
    [d.first_name, d.middle_name, d.last_name].filter(Boolean).join(" ").trim() || null;
}
function nameMatch(input, verified) {
  if (!verified || !input) return { match: false, score: 0 };
  const norm = (s) => s.toUpperCase().replace(/[^A-Z\s]/g, " ").split(/\s+/).filter((t) => t.length > 1);
  const a = new Set(norm(input)), b = new Set(norm(verified));
  if (!a.size || !b.size) return { match: false, score: 0 };
  let sh = 0; for (const t of a) if (b.has(t)) sh++;
  const score = sh / Math.min(a.size, b.size);
  return { match: score >= 0.5, score };
}

const url = `${BASE}/kyc/ng/lookup/nuban?account_number=${encodeURIComponent(acct)}&bank_code=${encodeURIComponent(code)}`;
console.log(`\nLooking up ${acct} @ ${bankName} (code ${code})…`);
const r = await fetch(url, { headers: { Accept: "application/json", token: KEY } });
const j = await r.json();
console.log("HTTP", r.status);
console.log("raw:", JSON.stringify(j).slice(0, 600));
const name = extractName(j);
console.log("\nverified name:", name);
if (expected) {
  const nm = nameMatch(expected, name);
  console.log(`match vs "${expected}": ${nm.match} (${(nm.score * 100).toFixed(0)}%)`);
}
