import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCron } from "@/lib/cron-auth";
import { isGigConfigured, getLocalStations } from "@/lib/gig";

// POST /api/cron/sync-gig-stations
//
// Refreshes the gig_stations cache from GIG's /localstations/get so checkout
// can map a buyer/seller address -> GIG StationId without a live call per
// order. Runs daily. Safe before GIG is live: no-ops until GIG_* is set.
//
// TODO(confirm): the exact field names in GIG's station payload (we guess
// StationId/StationName/StateName below). Once confirmed, tighten
// normalizeStations().

type StationRow = {
  gig_station_id: string;
  name: string | null;
  state_name: string | null;
  station_type: string;
  raw: unknown;
};

function normalizeStations(data: unknown): StationRow[] {
  // GIG's envelope `.data` is expected to be an array of stations (or wrap
  // one under a key). Be defensive until the shape is confirmed.
  const list: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as { stations?: unknown[] })?.stations)
    ? (data as { stations: unknown[] }).stations
    : [];

  return list
    .map((item) => {
      const s = item as Record<string, unknown>;
      const id =
        s.StationId ?? s.stationId ?? s.id ?? s.StationCode ?? s.code;
      return {
        gig_station_id: id != null ? String(id) : "",
        name: (s.StationName ?? s.name ?? null) as string | null,
        state_name: (s.StateName ?? s.state ?? null) as string | null,
        station_type: "local",
        raw: s,
      };
    })
    .filter((r) => r.gig_station_id);
}

export async function POST(request: Request) {
  const unauth = verifyCron(request);
  if (unauth) return unauth;

  if (!isGigConfigured()) {
    return NextResponse.json({ ok: true, skipped: "gig_not_configured" });
  }

  let envelope: { data: unknown };
  try {
    envelope = await getLocalStations();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  const rows = normalizeStations(envelope.data);
  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      upserted: 0,
      note: "no stations parsed — confirm GIG /localstations response shape",
    });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("gig_stations")
    .upsert(
      rows.map((r) => ({ ...r, synced_at: new Date().toISOString() })),
      { onConflict: "gig_station_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, upserted: rows.length });
}

export const GET = POST;
