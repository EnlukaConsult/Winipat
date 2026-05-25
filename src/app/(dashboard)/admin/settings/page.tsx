"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Sliders, Clock, Percent } from "lucide-react";

type Setting = { key: string; value: string; updated_at: string };

// Human-readable metadata for each setting key. Adding a new key in
// migration 004 should be mirrored here so it gets a friendly label
// + unit hint; otherwise it just shows the raw key.
const META: Record<
  string,
  { label: string; description: string; unit?: string; icon: React.ElementType }
> = {
  escrow_hold_hours: {
    label: "Escrow hold period",
    description: "How long funds are held after buyer confirms delivery, before they become release-eligible.",
    unit: "hours",
    icon: Clock,
  },
  sla_accept_hours: {
    label: "Seller accept SLA",
    description: "Sellers must accept a paid order within this many hours, or admins are notified.",
    unit: "hours",
    icon: Clock,
  },
  sla_ready_hours: {
    label: "Seller ready SLA",
    description: "Sellers must mark the order ready within this many hours of accepting.",
    unit: "hours",
    icon: Clock,
  },
  sla_pickup_hours: {
    label: "Pickup SLA",
    description: "Logistics partners must pick up within this many hours of an order being ready.",
    unit: "hours",
    icon: Clock,
  },
  platform_fee_bps: {
    label: "Platform commission",
    description: "Charged on released escrow, in basis points (300 = 3.00%).",
    unit: "bps",
    icon: Percent,
  },
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    setSettings(data.settings || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(key: string) {
    const value = edited[key];
    if (value === undefined || value === "") return;
    setSaving(key);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setSaving(null);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      alert(b.error || "Save failed.");
      return;
    }
    setEdited((m) => {
      const next = { ...m };
      delete next[key];
      return next;
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
          Platform Settings
        </h1>
        <p className="mt-0.5 text-sm text-slate-light">
          Tweak escrow timings, SLA windows, and commission rate. Changes take
          effect on the next cron tick.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-mist rounded-[--radius-md] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {settings.map((s) => {
            const m = META[s.key];
            const Icon = m?.icon ?? Sliders;
            const draftValue = edited[s.key] ?? s.value;
            const dirty = edited[s.key] !== undefined && edited[s.key] !== s.value;
            return (
              <Card key={s.key} padding="md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-[--radius-md] bg-violet/10 text-violet flex items-center justify-center shrink-0">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm">{m?.label || s.key}</CardTitle>
                      {m?.description && (
                        <CardDescription className="text-xs mt-0.5">
                          {m.description}
                        </CardDescription>
                      )}
                      <p className="text-[11px] text-slate-lighter mt-1 font-mono">
                        key: {s.key}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      value={draftValue}
                      onChange={(e) =>
                        setEdited((mm) => ({ ...mm, [s.key]: e.target.value }))
                      }
                      suffix={
                        m?.unit ? (
                          <span className="text-xs text-slate-lighter">{m.unit}</span>
                        ) : undefined
                      }
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => save(s.key)}
                    disabled={!dirty}
                    loading={saving === s.key}
                  >
                    <Save size={14} className="mr-1.5" />
                    Save
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
