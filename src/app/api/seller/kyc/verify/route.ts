import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  isPandascrowConfigured,
  lookupNin,
  lookupNuban,
  nameMatch,
  type KycResult,
} from "@/lib/pandascrow";
import { bankCodeForName } from "@/lib/nigeria-banks";

// POST /api/seller/kyc/verify   { nin?: string }
//
// Runs the automated Pandascrow KYC checks for the logged-in seller (NIN +
// bank-account/NUBAN), name-matches the results, and records them in
// seller_kyc_checks for the admin to see. The admin still makes the final
// approve/reject call — this only assists.
//
// Safe no-op when Pandascrow isn't configured, so onboarding works exactly as
// before until credentials are set. The raw NIN is used in-memory only and
// never persisted (only the last 4 digits + the match outcome are stored).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isPandascrowConfigured()) {
    return NextResponse.json({ ok: false, skipped: "pandascrow_not_configured" });
  }

  const { nin } = (await request.json().catch(() => ({}))) as { nin?: string };
  const admin = createAdminClient();

  // The seller must exist and belong to this user.
  const { data: seller } = await admin
    .from("sellers")
    .select("id, business_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!seller) return NextResponse.json({ ok: false, reason: "no seller" }, { status: 404 });

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const personName = profile?.full_name ?? seller.business_name ?? "";

  const results: Record<string, unknown> = {};

  // --- NIN check (individual identity) ---
  if (nin && /^\d{11}$/.test(nin.trim())) {
    const cleanNin = nin.trim();
    let row: Record<string, unknown>;
    try {
      const r: KycResult = await lookupNin(cleanNin);
      const nm = nameMatch(personName, r.verifiedName);
      row = {
        seller_id: seller.id,
        check_type: "nin",
        status: r.ok ? (nm.match ? "pass" : "fail") : "error",
        input_last4: cleanNin.slice(-4),
        verified_name: r.verifiedName,
        name_match: r.ok ? nm.match : null,
        match_score: r.ok ? Number(nm.score.toFixed(3)) : null,
        message: r.message,
      };
    } catch (e) {
      row = {
        seller_id: seller.id,
        check_type: "nin",
        status: "error",
        input_last4: cleanNin.slice(-4),
        message: (e as Error).message,
      };
    }
    await admin.from("seller_kyc_checks").insert(row);
    results.nin = { status: row.status, name_match: row.name_match };
  }

  // --- NUBAN check (bank account) ---
  const { data: bank } = await admin
    .from("bank_accounts")
    .select("id, bank_name, account_number, account_name")
    .eq("seller_id", seller.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (bank?.account_number) {
    const bankCode = bankCodeForName(bank.bank_name);
    if (!bankCode) {
      await admin.from("seller_kyc_checks").insert({
        seller_id: seller.id,
        check_type: "nuban",
        status: "error",
        input_last4: String(bank.account_number).slice(-4),
        message: `No bank_code mapped for "${bank.bank_name}"`,
      });
      results.nuban = { status: "error", reason: "no bank_code" };
    } else {
      let row: Record<string, unknown>;
      let verifiedName: string | null = null;
      let matched: boolean | null = null;
      try {
        const r: KycResult = await lookupNuban(String(bank.account_number), bankCode);
        verifiedName = r.verifiedName;
        const nm = nameMatch(bank.account_name ?? personName, r.verifiedName);
        matched = r.ok ? nm.match : null;
        row = {
          seller_id: seller.id,
          check_type: "nuban",
          status: r.ok ? (nm.match ? "pass" : "fail") : "error",
          input_last4: String(bank.account_number).slice(-4),
          verified_name: r.verifiedName,
          name_match: matched,
          match_score: r.ok ? Number(nm.score.toFixed(3)) : null,
          message: r.message,
        };
      } catch (e) {
        row = {
          seller_id: seller.id,
          check_type: "nuban",
          status: "error",
          input_last4: String(bank.account_number).slice(-4),
          message: (e as Error).message,
        };
      }
      await admin.from("seller_kyc_checks").insert(row);
      // Cache the verified name; only mark the account verified on a match.
      await admin
        .from("bank_accounts")
        .update({ verified_name: verifiedName, is_verified: matched === true, bank_code: bankCode })
        .eq("id", bank.id);
      results.nuban = { status: row.status, name_match: matched };
    }
  }

  return NextResponse.json({ ok: true, results });
}
