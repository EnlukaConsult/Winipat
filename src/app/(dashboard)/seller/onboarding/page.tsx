"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getStateOptions, getCityOptions } from "@/lib/nigeria-locations";
import {
  Building2,
  MapPin,
  FileText,
  Banknote,
  CheckCircle2,
  Upload,
  X,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
  Shield,
} from "lucide-react";
import { useRouter } from "next/navigation";

// 4-step KYC wizard per FRD FR-SEL-002. Review is a 5th UI state, not a
// numbered step.
const STEPS = [
  { id: 1, label: "Business Info",   icon: Building2 },
  { id: 2, label: "Pickup Address",  icon: MapPin },
  { id: 3, label: "KYC Documents",   icon: FileText },
  { id: 4, label: "Bank Account",    icon: Banknote },
  { id: 5, label: "Review",          icon: CheckCircle2 },
];

const NIGERIAN_BANKS = [
  { value: "Access Bank", label: "Access Bank" },
  { value: "Citibank Nigeria", label: "Citibank Nigeria" },
  { value: "Ecobank Nigeria", label: "Ecobank Nigeria" },
  { value: "First City Monument Bank (FCMB)", label: "First City Monument Bank (FCMB)" },
  { value: "Fidelity Bank", label: "Fidelity Bank" },
  { value: "First Bank of Nigeria", label: "First Bank of Nigeria" },
  { value: "Guaranty Trust Bank (GTBank)", label: "Guaranty Trust Bank (GTBank)" },
  { value: "Heritage Bank", label: "Heritage Bank" },
  { value: "Keystone Bank", label: "Keystone Bank" },
  { value: "OPay", label: "OPay" },
  { value: "PalmPay", label: "PalmPay" },
  { value: "Polaris Bank", label: "Polaris Bank" },
  { value: "Providus Bank", label: "Providus Bank" },
  { value: "Stanbic IBTC Bank", label: "Stanbic IBTC Bank" },
  { value: "Sterling Bank", label: "Sterling Bank" },
  { value: "United Bank for Africa (UBA)", label: "United Bank for Africa (UBA)" },
  { value: "Union Bank of Nigeria", label: "Union Bank of Nigeria" },
  { value: "Unity Bank", label: "Unity Bank" },
  { value: "Wema Bank", label: "Wema Bank" },
  { value: "Zenith Bank", label: "Zenith Bank" },
];

interface FormData {
  // Step 1 — Business Info
  businessName: string;
  description: string;
  // Step 2 — Pickup Address
  pickupAddress: string;
  pickupCity: string;
  pickupState: string;
  // Step 3 — KYC Documents
  govtIdFile: File | null;
  // Utility bill (electricity, waste, water) — recent issue with the
  // seller's pickup address printed on it. Replaced an earlier
  // "bank statement" requirement that many Nigerian sellers were
  // uncomfortable sharing.
  utilityBillFile: File | null;
  // Step 4 — Bank Account
  bankName: string;
  accountNumber: string;
  accountName: string;
  // Step 5 — Review (agreements per BR-050)
  acceptTerms: boolean;
  acceptEscrow: boolean;
}

interface FileUploadAreaProps {
  label: string;
  hint: string;
  file: File | null;
  onFile: (f: File | null) => void;
  accept?: string;
  required?: boolean;
}

function FileUploadArea({ label, hint, file, onFile, accept = "image/*,.pdf", required }: FileUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="mb-1.5 block text-sm font-medium text-slate">
        {label}{required && <span className="text-error ml-1">*</span>}
      </p>
      {file ? (
        <div className="flex items-center gap-3 rounded-[--radius-md] border border-emerald/40 bg-emerald/5 px-4 py-3">
          <FileText size={18} className="text-emerald shrink-0" />
          <span className="text-sm text-midnight font-medium truncate flex-1">{file.name}</span>
          <button
            type="button"
            onClick={() => onFile(null)}
            className="text-slate-lighter hover:text-error transition-colors"
            aria-label="Remove file"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-[--radius-md] border-2 border-dashed border-mist-dark bg-cloud hover:border-royal hover:bg-royal/5 transition-colors px-4 py-6 flex flex-col items-center gap-2 cursor-pointer"
        >
          <Upload size={22} className="text-slate-lighter" />
          <span className="text-sm font-medium text-slate">Click to upload</span>
          <span className="text-xs text-slate-light">{hint}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            // 5 MB cap per FRD (KYC docs)
            if (f.size > 5 * 1024 * 1024) {
              alert("File is too large. Max size is 5 MB.");
              return;
            }
            onFile(f);
          }
        }}
      />
    </div>
  );
}

export default function SellerOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    businessName: "",
    description: "",
    pickupAddress: "",
    pickupCity: "",
    pickupState: "",
    govtIdFile: null,
    utilityBillFile: null,
    bankName: "",
    accountNumber: "",
    accountName: "",
    acceptTerms: false,
    acceptEscrow: false,
  });

  // Pre-load any existing draft / rejected seller so the user resumes where they left off
  useEffect(() => {
    async function loadExisting() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: seller } = await supabase
        .from("sellers")
        .select("business_name, description, pickup_address, pickup_city, pickup_state, status, admin_notes")
        .eq("id", user.id)
        .maybeSingle();
      if (seller) {
        setExistingStatus(seller.status);
        if (seller.status === "rejected") setRejectionNotes(seller.admin_notes);
        setForm((prev) => ({
          ...prev,
          businessName: seller.business_name ?? "",
          description: seller.description ?? "",
          pickupAddress: seller.pickup_address ?? "",
          pickupCity: seller.pickup_city ?? "",
          pickupState: seller.pickup_state ?? "",
        }));
      }
    }
    loadExisting();
  }, []);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function canProceed(): boolean {
    if (step === 1) return !!form.businessName.trim();
    if (step === 2) return !!form.pickupAddress.trim() && !!form.pickupState;
    if (step === 3) return !!form.govtIdFile;
    if (step === 4) return !!form.bankName && form.accountNumber.length === 10 && !!form.accountName.trim();
    if (step === 5) return form.acceptTerms && form.acceptEscrow;
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated. Please sign in again.");
      if (!form.govtIdFile) throw new Error("Government ID is required.");

      const uploadToStorage = async (file: File, prefix: string): Promise<string> => {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${user.id}/${prefix}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("kyc-documents")
          .upload(path, file, { upsert: true });
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
        const { data } = supabase.storage.from("kyc-documents").getPublicUrl(path);
        return data.publicUrl;
      };

      // 1. Upsert the seller record (status -> submitted, agreement timestamps set)
      const now = new Date().toISOString();
      const wasRejected = existingStatus === "rejected";
      const sellerPayload = {
        id: user.id,
        business_name: form.businessName.trim(),
        description: form.description.trim() || null,
        pickup_address: form.pickupAddress.trim(),
        pickup_city: form.pickupCity || null,
        pickup_state: form.pickupState || null,
        terms_accepted_at: now,
        escrow_agreement_accepted_at: now,
        status: "submitted" as const,
        admin_notes: null,            // clear any prior rejection note on resubmit
        updated_at: now,
      };
      const { error: sellerError } = await supabase
        .from("sellers")
        .upsert(sellerPayload, { onConflict: "id" });
      if (sellerError) throw new Error(`Saving seller profile: ${sellerError.message}`);

      // On resubmit after rejection, bump appeal_count (Swimlane: 1 appeal max for KYC).
      // Read-then-write is OK here — appeal increments happen rarely and only after
      // the seller manually resubmits; race conditions are not a concern.
      if (wasRejected) {
        const { data: current } = await supabase
          .from("sellers")
          .select("appeal_count")
          .eq("id", user.id)
          .maybeSingle();
        const nextCount = (current?.appeal_count ?? 0) + 1;
        await supabase
          .from("sellers")
          .update({ appeal_count: nextCount })
          .eq("id", user.id);
      }

      // 2. Upload KYC documents and create their records
      const govtIdUrl = await uploadToStorage(form.govtIdFile, "govt-id");
      const docInserts: Array<{ seller_id: string; document_type: "government_id" | "utility_bill"; file_url: string }> = [
        { seller_id: user.id, document_type: "government_id", file_url: govtIdUrl },
      ];
      if (form.utilityBillFile) {
        const utilityUrl = await uploadToStorage(form.utilityBillFile, "utility-bill");
        docInserts.push({ seller_id: user.id, document_type: "utility_bill", file_url: utilityUrl });
      }
      const { error: docsError } = await supabase
        .from("seller_kyc_documents")
        .insert(docInserts);
      if (docsError) throw new Error(`Saving KYC documents: ${docsError.message}`);

      // 3. Upsert bank account record (single account per FRD)
      const { error: bankError } = await supabase
        .from("bank_accounts")
        .insert({
          seller_id: user.id,
          bank_name: form.bankName,
          account_number: form.accountNumber.trim(),
          account_name: form.accountName.trim(),
          is_verified: false,    // Paystack name-match validation happens server-side later
        });
      if (bankError) throw new Error(`Saving bank account: ${bankError.message}`);

      router.push("/seller");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Block resubmits when application is already under review or approved
  if (existingStatus === "submitted" || existingStatus === "under_review") {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <div className="flex items-start gap-3">
            <Loader2 className="text-royal animate-spin shrink-0 mt-0.5" size={20} />
            <div>
              <CardTitle>Your application is under review</CardTitle>
              <CardDescription>
                We&apos;ve received your details and our team is reviewing them.
                You&apos;ll be notified by email when a decision is made — usually within 1–2 business days.
              </CardDescription>
            </div>
          </div>
        </Card>
      </div>
    );
  }
  if (existingStatus === "approved") {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-emerald shrink-0 mt-0.5" size={20} />
            <div>
              <CardTitle>You&apos;re verified</CardTitle>
              <CardDescription>Your seller account is approved. Head back to the dashboard to start listing products.</CardDescription>
              <Button variant="primary" size="sm" className="mt-4" onClick={() => router.push("/seller")}>
                Go to dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;
  const currentStep = STEPS[step - 1];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
          Seller Onboarding
        </h1>
        <p className="text-slate-light mt-1">
          Complete the steps below to start selling on Winipat.
        </p>
      </div>

      {/* Resubmit banner when previously rejected */}
      {existingStatus === "rejected" && (
        <div className="rounded-[--radius-md] border border-error/30 bg-error/5 px-4 py-3 flex gap-3">
          <AlertCircle size={18} className="text-error mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-error">Your previous application was rejected.</p>
            {rejectionNotes && (
              <p className="text-sm text-slate mt-1"><span className="font-medium">Reason: </span>{rejectionNotes}</p>
            )}
            <p className="text-xs text-slate-light mt-1">
              Update the affected sections and resubmit. You may appeal a rejection once.
            </p>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex justify-between">
          {STEPS.map((s) => (
            <div key={s.id} className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                  step > s.id
                    ? "border-emerald bg-emerald text-white"
                    : step === s.id
                    ? "border-royal bg-royal text-white"
                    : "border-mist-dark bg-white text-slate-lighter"
                }`}
              >
                {step > s.id ? <CheckCircle2 size={16} /> : <s.icon size={16} />}
              </div>
              <span
                className={`hidden sm:block text-xs font-medium ${step >= s.id ? "text-midnight" : "text-slate-lighter"}`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
        <div className="relative h-1.5 w-full rounded-full bg-mist overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-royal transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-slate-light text-right">Step {step} of {STEPS.length}</p>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{currentStep.label}</CardTitle>
          <CardDescription>
            {step === 1 && "Tell buyers about your business."}
            {step === 2 && "Where will orders be picked up from?"}
            {step === 3 && "Upload required identification documents for verification."}
            {step === 4 && "Add your bank account to receive payouts."}
            {step === 5 && "Review your details and accept our agreements before submitting."}
          </CardDescription>
        </CardHeader>

        {step === 1 && (
          <div className="space-y-4">
            <Input
              label="Business Name *"
              placeholder="e.g. Amaka Fashion House"
              value={form.businessName}
              onChange={(e) => set("businessName", e.target.value)}
            />
            <Textarea
              label="Business Description"
              placeholder="What do you sell, your specialty, and why customers should choose you..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Input
              label="Street Address *"
              placeholder="Street address where orders will be collected"
              value={form.pickupAddress}
              onChange={(e) => set("pickupAddress", e.target.value)}
              icon={<MapPin size={16} />}
            />
            <div className="grid grid-cols-2 gap-4">
              <SearchableSelect
                label="State *"
                placeholder="Select state"
                options={getStateOptions()}
                value={form.pickupState}
                onChange={(val) => { set("pickupState", val); set("pickupCity", ""); }}
              />
              <SearchableSelect
                label="City"
                placeholder={form.pickupState ? "Select city" : "Select state first"}
                options={getCityOptions(form.pickupState)}
                value={form.pickupCity}
                onChange={(val) => set("pickupCity", val)}
                disabled={!form.pickupState}
              />
            </div>
            <p className="text-xs text-slate-light">
              Logistics partners will use this address to schedule pickups.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="rounded-[--radius-md] bg-royal/8 border border-royal/20 px-4 py-3 flex gap-3">
              <AlertCircle size={16} className="text-royal mt-0.5 shrink-0" />
              <p className="text-sm text-royal">
                Accepted formats: JPEG, PNG, PDF. Max file size: 5 MB per document.
              </p>
            </div>
            <FileUploadArea
              label="Government-Issued ID"
              hint="NIN slip, passport, voter's card, or driver's licence"
              file={form.govtIdFile}
              onFile={(f) => set("govtIdFile", f)}
              required
            />
            <FileUploadArea
              label="Utility bill (optional but recommended)"
              hint="Most recent electricity, waste or water bill — must show your pickup address. Speeds up approval."
              file={form.utilityBillFile}
              onFile={(f) => set("utilityBillFile", f)}
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <Select
              label="Bank Name *"
              options={NIGERIAN_BANKS}
              placeholder="Select your bank"
              value={form.bankName}
              onChange={(e) => set("bankName", e.target.value)}
            />
            <Input
              label="Account Number *"
              placeholder="10-digit NUBAN account number"
              value={form.accountNumber}
              onChange={(e) => set("accountNumber", e.target.value.replace(/\D/g, "").slice(0, 10))}
              maxLength={10}
            />
            <Input
              label="Account Name *"
              placeholder="Exact name on bank account"
              value={form.accountName}
              onChange={(e) => set("accountName", e.target.value)}
            />
            <p className="text-xs text-slate-light">
              Payouts settle daily after a 48-hour escrow hold from order delivery. Your name will be matched against the bank record before the first payout.
            </p>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <div className="rounded-[--radius-md] border border-mist divide-y divide-mist overflow-hidden">
              <ReviewRow label="Business Name" value={form.businessName} />
              <ReviewRow label="Description" value={form.description || "—"} />
              <ReviewRow
                label="Pickup Address"
                value={[form.pickupAddress, form.pickupCity, form.pickupState].filter(Boolean).join(", ")}
              />
              <ReviewRow
                label="Government ID"
                value={form.govtIdFile ? form.govtIdFile.name : "Not uploaded"}
                badge={form.govtIdFile ? "success" : "error"}
              />
              <ReviewRow
                label="Utility bill"
                value={form.utilityBillFile ? form.utilityBillFile.name : "Not provided"}
              />
              <ReviewRow label="Bank" value={`${form.bankName} — ${form.accountNumber}`} />
              <ReviewRow label="Account Name" value={form.accountName} />
            </div>

            {/* Required agreements per BR-050 */}
            <div className="rounded-[--radius-md] border border-mist-dark bg-cloud p-4 space-y-3">
              <div className="flex gap-2 items-start mb-2">
                <Shield size={16} className="text-royal mt-0.5 shrink-0" />
                <p className="text-sm font-semibold text-midnight">
                  Required agreements
                </p>
              </div>
              <label className="flex gap-3 items-start cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 accent-royal cursor-pointer shrink-0"
                  checked={form.acceptTerms}
                  onChange={(e) => set("acceptTerms", e.target.checked)}
                />
                <span className="text-sm text-slate">
                  I have read and agree to Winipat&apos;s{" "}
                  <a href="/legal/seller-terms" target="_blank" className="text-royal underline">Seller Terms of Service</a>.
                </span>
              </label>
              <label className="flex gap-3 items-start cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 accent-royal cursor-pointer shrink-0"
                  checked={form.acceptEscrow}
                  onChange={(e) => set("acceptEscrow", e.target.checked)}
                />
                <span className="text-sm text-slate">
                  I understand that buyer payments are held in escrow by Winipat and released to me 48 hours after delivery confirmation, net of a 12% platform commission. See{" "}
                  <a href="/legal/escrow-policy" target="_blank" className="text-royal underline">Escrow Policy</a>.
                </span>
              </label>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-[--radius-md] bg-error/8 border border-error/30 px-4 py-3">
                <AlertCircle size={16} className="text-error mt-0.5 shrink-0" />
                <p className="text-sm text-error">{error}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between gap-3">
        {step > 1 ? (
          <Button variant="outline" size="md" onClick={() => setStep((s) => s - 1)} disabled={submitting}>
            <ChevronLeft size={16} className="mr-1" />
            Back
          </Button>
        ) : (
          <div />
        )}

        {step < STEPS.length ? (
          <Button
            variant="primary"
            size="md"
            disabled={!canProceed()}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
            <ChevronRight size={16} className="ml-1" />
          </Button>
        ) : (
          <Button
            variant="gold"
            size="md"
            loading={submitting}
            disabled={submitting || !canProceed()}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit for Verification"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: "success" | "error";
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-sm text-slate-light shrink-0 w-36">{label}</span>
      <span className="text-sm text-midnight text-right flex-1 break-all">{value}</span>
      {badge && (
        <Badge variant={badge} className="ml-2 shrink-0">
          {badge === "success" ? "Uploaded" : "Missing"}
        </Badge>
      )}
    </div>
  );
}
