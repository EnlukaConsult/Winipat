"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle2, AlertCircle, User, Mail, Phone } from "lucide-react";

const CATEGORY_OPTIONS = [
  { value: "order_issue",        label: "Order issue (delivery, refund, dispute)" },
  { value: "payment",            label: "Payment / escrow question" },
  { value: "seller_application", label: "Becoming a seller" },
  { value: "kyc_question",       label: "KYC / verification" },
  { value: "dispute_help",       label: "Dispute help" },
  { value: "partnership",        label: "Partnership / press" },
  { value: "feedback",           label: "Product feedback" },
  { value: "other",              label: "Something else" },
];

function ContactFormInner() {
  const params = useSearchParams();
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [phone,   setPhone]   = useState("");
  const [category, setCategory] = useState("other");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [chatContext, setChatContext] = useState("");
  const [hp, setHp] = useState(""); // honeypot — never user-touched

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from query params if the chat widget passed a transcript /
  // suggested subject (?subject=...&chat=base64...)
  useEffect(() => {
    const s = params.get("subject");
    if (s) setSubject(s.slice(0, 200));
    const cat = params.get("category");
    if (cat) setCategory(cat);
    const chat = params.get("chat");
    if (chat) {
      try {
        // base64 -> plain text
        setChatContext(atob(decodeURIComponent(chat)));
      } catch {
        // ignore — malformed
      }
    }
  }, [params]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, phone, category, subject, message,
          chatContext: chatContext || undefined,
          hp,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Could not send your message. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-10">
        <div className="w-14 h-14 rounded-full bg-emerald/10 mx-auto flex items-center justify-center mb-4">
          <CheckCircle2 className="text-emerald" size={28} />
        </div>
        <h2 className="text-xl font-bold text-midnight font-[family-name:var(--font-sora)]">
          Message sent
        </h2>
        <p className="mt-2 text-sm text-slate-light max-w-md mx-auto">
          Thanks {name?.split(" ")[0] || ""} — we&apos;ve received your enquiry
          and will reply to <strong>{email}</strong> within one business day.
        </p>
        <p className="mt-4 text-xs text-slate-lighter">
          Need to send another? Refresh this page.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {/* Honeypot — visually hidden, off-screen, no autofill triggers */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        className="absolute -left-[10000px] w-px h-px opacity-0"
        aria-hidden="true"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Full name *"
          placeholder="Chidi Okafor"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={<User size={14} />}
          required
        />
        <Input
          label="Email *"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail size={14} />}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Phone (optional)"
          type="tel"
          placeholder="08012345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          icon={<Phone size={14} />}
        />
        <Select
          label="Category"
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </div>

      <Input
        label="Subject *"
        placeholder="e.g. Order WNP-… hasn't been delivered"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        required
      />

      <Textarea
        label="Message *"
        placeholder="Give us as much detail as you can — order numbers, dates, screenshots if you have them."
        rows={6}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
      />

      {chatContext && (
        <details className="text-xs">
          <summary className="cursor-pointer text-slate-light hover:text-slate">
            Chat transcript will be attached ({chatContext.length} chars)
          </summary>
          <pre className="mt-2 max-h-32 overflow-auto bg-cloud rounded-md p-3 text-[10px] text-slate whitespace-pre-wrap">
            {chatContext}
          </pre>
        </details>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-[--radius-md] bg-error/8 border border-error/20 px-3 py-2 text-sm text-error">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={submitting}
        disabled={submitting}
        className="w-full"
      >
        <Send size={14} className="mr-2" />
        Send message
      </Button>

      <p className="text-[10px] text-slate-lighter text-center">
        We&apos;ll only use this information to respond to your enquiry. By
        sending, you agree to our{" "}
        <a href="/legal/privacy" className="text-violet hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}

export function ContactForm() {
  return (
    <Suspense fallback={<div className="h-96 bg-mist rounded-md animate-pulse" />}>
      <ContactFormInner />
    </Suspense>
  );
}
