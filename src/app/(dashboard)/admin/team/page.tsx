"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { UserPlus, Shield, X, Mail, AlertCircle } from "lucide-react";

type Admin = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
};

export default function AdminTeamPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "err"; msg: string } | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/team");
    const body = await res.json();
    setAdmins(body.admins || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function promote(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    setFeedback(null);
    const res = await fetch("/api/admin/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const body = await res.json();
    setInviting(false);
    if (!res.ok) {
      setFeedback({ kind: "err", msg: body.error || "Could not promote user." });
      return;
    }
    setFeedback({
      kind: "ok",
      msg: `${body.promoted.email} is now an admin. They need to sign out and back in to see the admin portal.`,
    });
    setEmail("");
    await load();
  }

  async function demote(adminId: string, adminEmail: string) {
    if (!confirm(`Remove admin access from ${adminEmail}?`)) return;
    const res = await fetch(`/api/admin/team?id=${adminId}`, { method: "DELETE" });
    const body = await res.json();
    if (!res.ok) {
      alert(body.error || "Could not demote.");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
          Admin Team
        </h1>
        <p className="mt-0.5 text-sm text-slate-light">
          Anyone with the admin role can manage the platform. Add or remove
          teammates here.
        </p>
      </div>

      <Card padding="md">
        <CardTitle className="text-sm flex items-center gap-2 mb-1">
          <UserPlus size={14} className="text-violet" />
          Promote a teammate
        </CardTitle>
        <CardDescription className="text-xs mb-4">
          The person must register an account at{" "}
          <a
            href="/register"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet hover:underline"
          >
            /register
          </a>{" "}
          first. Paste their email here and they&apos;ll get admin powers on
          their next sign-in.
        </CardDescription>

        <form onSubmit={promote} className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail size={14} />}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={inviting}
            disabled={!email.trim()}
          >
            <UserPlus size={14} className="mr-1.5" />
            Promote to admin
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
          <Shield size={14} className="text-violet" />
          Current admins
        </CardTitle>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-mist rounded-[--radius-md] animate-pulse" />
            ))}
          </div>
        ) : admins.length === 0 ? (
          <Card padding="md">
            <p className="text-sm text-slate-light text-center py-4">
              No admins yet. That shouldn&apos;t be possible — you wouldn&apos;t
              see this page.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {admins.map((a) => (
              <Card key={a.id} padding="sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet to-teal text-white flex items-center justify-center font-bold shrink-0">
                      {a.full_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-midnight truncate">
                        {a.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-slate-light truncate">{a.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="royal" className="text-[10px]">
                      Admin
                    </Badge>
                    <span className="text-[10px] text-slate-lighter hidden sm:inline">
                      since {formatDate(a.created_at)}
                    </span>
                    <button
                      onClick={() => demote(a.id, a.email)}
                      className="p-1.5 rounded-md text-slate-lighter hover:text-error hover:bg-error/10 transition-colors"
                      aria-label="Remove admin"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
