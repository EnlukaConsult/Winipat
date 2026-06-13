"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  Key,
  Users,
  UserPlus,
  X,
  Save,
  Trash2,
  Lock,
  AlertCircle,
  Mail,
} from "lucide-react";

type Permission = { key: string; description: string; category: string };
type Member = {
  id: string;
  full_name: string;
  role: string;
  assigned_at: string;
};
type GroupDetail = {
  group: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    is_system: boolean;
    primary_persona: string | null;
  };
  catalog: Permission[];
  permission_keys: string[];
  members: Member[];
};

const CATEGORY_LABEL: Record<string, string> = {
  admin: "Admin",
  seller: "Seller",
  buyer: "Buyer",
  logistics: "Logistics",
};

export function GroupDetailClient({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [data, setData] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [savingPerms, setSavingPerms] = useState(false);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "err"; msg: string } | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/groups/${groupId}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const body = (await res.json()) as GroupDetail;
    setData(body);
    setSelected(new Set(body.permission_keys));
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const isSuperAdmin = data?.group.slug === "super-admin";
  const permsLocked = isSuperAdmin;

  function togglePerm(key: string) {
    if (permsLocked) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function savePerms() {
    setSavingPerms(true);
    setFeedback(null);
    const res = await fetch(`/api/admin/groups/${groupId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: Array.from(selected) }),
    });
    const body = await res.json();
    setSavingPerms(false);
    if (!res.ok) {
      setFeedback({ kind: "err", msg: body.error || "Could not save permissions." });
      return;
    }
    setFeedback({ kind: "ok", msg: "Permissions updated." });
    await load();
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    setFeedback(null);
    const res = await fetch(`/api/admin/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const body = await res.json();
    setAdding(false);
    if (!res.ok) {
      setFeedback({ kind: "err", msg: body.error || "Could not add member." });
      return;
    }
    setEmail("");
    await load();
  }

  async function removeMember(userId: string, label: string) {
    if (!confirm(`Remove ${label} from this group?`)) return;
    const res = await fetch(
      `/api/admin/groups/${groupId}/members?userId=${userId}`,
      { method: "DELETE" }
    );
    const body = await res.json();
    if (!res.ok) {
      setFeedback({ kind: "err", msg: body.error || "Could not remove member." });
      return;
    }
    await load();
  }

  async function deleteGroup() {
    if (!data) return;
    if (!confirm(`Delete the "${data.group.name}" group? This can't be undone.`))
      return;
    const res = await fetch(`/api/admin/groups/${groupId}`, { method: "DELETE" });
    const body = await res.json();
    if (!res.ok) {
      setFeedback({ kind: "err", msg: body.error || "Could not delete group." });
      return;
    }
    router.push("/admin/groups");
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <div className="h-8 w-48 bg-mist rounded animate-pulse" />
        <div className="h-64 bg-mist rounded-[--radius-md] animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card padding="md">
        <p className="text-sm text-slate-light text-center py-6">
          Group not found.
        </p>
      </Card>
    );
  }

  const dirty =
    selected.size !== data.permission_keys.length ||
    data.permission_keys.some((k) => !selected.has(k));

  // Group the catalog by category for the matrix.
  const byCategory = data.catalog.reduce<Record<string, Permission[]>>(
    (acc, p) => {
      (acc[p.category] ??= []).push(p);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
              {data.group.name}
            </h1>
            {data.group.is_system && (
              <Badge variant="default" className="text-[10px] gap-1">
                <Lock size={9} />
                System
              </Badge>
            )}
            {data.group.primary_persona && (
              <Badge variant="royal" className="text-[10px] capitalize">
                Default · {data.group.primary_persona}
              </Badge>
            )}
          </div>
          {data.group.description && (
            <p className="mt-0.5 text-sm text-slate-light">
              {data.group.description}
            </p>
          )}
        </div>
        {!data.group.is_system && (
          <Button variant="outline" size="sm" onClick={deleteGroup}>
            <Trash2 size={14} className="mr-1.5" />
            Delete
          </Button>
        )}
      </div>

      {feedback && (
        <div
          className={
            feedback.kind === "ok"
              ? "rounded-[--radius-md] bg-emerald/10 border border-emerald/30 px-3 py-2 text-xs text-emerald-dark"
              : "rounded-[--radius-md] bg-error/8 border border-error/20 px-3 py-2 text-xs text-error"
          }
        >
          <p className="flex items-start gap-2">
            {feedback.kind === "err" && (
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
            )}
            {feedback.msg}
          </p>
        </div>
      )}

      {/* Permissions matrix */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Key size={14} className="text-violet" />
            Permissions
          </CardTitle>
          {!permsLocked && (
            <Button
              variant="primary"
              size="sm"
              onClick={savePerms}
              loading={savingPerms}
              disabled={!dirty}
            >
              <Save size={14} className="mr-1.5" />
              Save
            </Button>
          )}
        </div>

        {permsLocked && (
          <div className="mb-3 rounded-[--radius-md] bg-mist/60 px-3 py-2 text-xs text-slate-light flex items-center gap-2">
            <Lock size={12} />
            Super Admin always holds every permission — this set is locked.
          </div>
        )}

        <div className="space-y-5">
          {Object.entries(byCategory).map(([category, perms]) => (
            <div key={category}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-light">
                {CATEGORY_LABEL[category] ?? category}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {perms.map((p) => {
                  const checked = selected.has(p.key);
                  return (
                    <label
                      key={p.key}
                      className={`flex items-start gap-2.5 rounded-[--radius-md] border p-2.5 transition-colors ${
                        permsLocked
                          ? "cursor-not-allowed opacity-70 border-mist"
                          : checked
                          ? "cursor-pointer border-violet/40 bg-violet/5"
                          : "cursor-pointer border-mist hover:border-mist-dark"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={permsLocked}
                        onChange={() => togglePerm(p.key)}
                        className="mt-0.5 h-4 w-4 accent-violet"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-midnight">
                          {p.description}
                        </p>
                        <p className="text-[10px] text-slate-lighter font-mono">
                          {p.key}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Members */}
      <Card padding="md">
        <CardTitle className="text-sm flex items-center gap-2 mb-1">
          <Users size={14} className="text-violet" />
          Members ({data.members.length})
        </CardTitle>
        <CardDescription className="text-xs mb-4">
          Add a registered user by email. They get this group&apos;s permissions
          on their next request.
        </CardDescription>

        <form onSubmit={addMember} className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="person@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail size={14} />}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={adding}
            disabled={!email.trim()}
          >
            <UserPlus size={14} className="mr-1.5" />
            Add member
          </Button>
        </form>

        {data.members.length === 0 ? (
          <p className="text-sm text-slate-light text-center py-4">
            No members yet.
          </p>
        ) : (
          <div className="space-y-2">
            {data.members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-[--radius-md] border border-mist p-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet to-teal text-white flex items-center justify-center font-bold shrink-0 text-sm">
                    {m.full_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-midnight truncate">
                      {m.full_name}
                    </p>
                    <p className="text-[11px] text-slate-light capitalize">
                      {m.role} · added {formatDate(m.assigned_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeMember(m.id, m.full_name)}
                  className="p-1.5 rounded-md text-slate-lighter hover:text-error hover:bg-error/10 transition-colors shrink-0"
                  aria-label="Remove member"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
