"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Plus,
  Users,
  Key,
  ChevronRight,
  AlertCircle,
  Lock,
} from "lucide-react";

type Group = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_system: boolean;
  primary_persona: string | null;
  permission_keys: string[];
  member_count: number;
};

export function GroupsClient() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "err"; msg: string } | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/groups");
    const body = await res.json();
    setGroups(body.groups || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setFeedback(null);
    const res = await fetch("/api/admin/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() }),
    });
    const body = await res.json();
    setCreating(false);
    if (!res.ok) {
      setFeedback({ kind: "err", msg: body.error || "Could not create group." });
      return;
    }
    setName("");
    setDescription("");
    setFeedback({ kind: "ok", msg: "Group created." });
    await load();
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
          Security Groups
        </h1>
        <p className="mt-0.5 text-sm text-slate-light">
          Compose permissions into groups, then assign people to them. A user&apos;s
          access is the union of every group they belong to.
        </p>
      </div>

      <Card padding="md">
        <CardTitle className="text-sm flex items-center gap-2 mb-1">
          <Plus size={14} className="text-violet" />
          New group
        </CardTitle>
        <CardDescription className="text-xs mb-4">
          Create a custom group (e.g. &ldquo;Finance Team&rdquo;), then open it to
          pick permissions and add members.
        </CardDescription>

        <form onSubmit={createGroup} className="space-y-3">
          <Input
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<ShieldCheck size={14} />}
          />
          <Input
            placeholder="Short description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={creating}
            disabled={!name.trim()}
          >
            <Plus size={14} className="mr-1.5" />
            Create group
          </Button>
        </form>

        {feedback && (
          <div
            className={
              feedback.kind === "ok"
                ? "mt-3 rounded-[--radius-md] bg-emerald/10 border border-emerald/30 px-3 py-2 text-xs text-emerald-dark"
                : "mt-3 rounded-[--radius-md] bg-error/8 border border-error/20 px-3 py-2 text-xs text-error"
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
      </Card>

      <div>
        <CardTitle className="text-sm flex items-center gap-2 mb-3">
          <ShieldCheck size={14} className="text-violet" />
          All groups
        </CardTitle>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 bg-mist rounded-[--radius-md] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => (
              <Link key={g.id} href={`/admin/groups/${g.id}`}>
                <Card padding="sm" hover>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-midnight">
                          {g.name}
                        </p>
                        {g.is_system && (
                          <Badge variant="default" className="text-[10px] gap-1">
                            <Lock size={9} />
                            System
                          </Badge>
                        )}
                        {g.primary_persona && (
                          <Badge variant="royal" className="text-[10px] capitalize">
                            Default · {g.primary_persona}
                          </Badge>
                        )}
                      </div>
                      {g.description && (
                        <p className="mt-0.5 text-xs text-slate-light truncate">
                          {g.description}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-4 text-[11px] text-slate-light">
                        <span className="inline-flex items-center gap-1">
                          <Key size={11} />
                          {g.permission_keys.length} permission
                          {g.permission_keys.length === 1 ? "" : "s"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users size={11} />
                          {g.member_count} member
                          {g.member_count === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-slate-lighter shrink-0"
                    />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
