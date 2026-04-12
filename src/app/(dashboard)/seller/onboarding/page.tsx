"use client";

import { useState, useRef } from "react";
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
} from "lucide-react";
import { useRouter } from "next/navigation";

const STEPS = [
  { id: 1, label: "Business Info", icon: Building2 },
  { id: 2, label: "KYC Documents", icon: FileText },
  { id: 3, label: "Bank Account", icon: Banknote },
  { id: 4, label: "Review", icon: CheckCircle2 },
];

const NIGERIAN_BANKS = [
  { value: "access", label: "Access Bank" },
  { value: "citibank", label: "Citibank Nigeria" },
  { value: "ecobank", label: "Ecobank Nigeria" },
  { value: "fcmb", label: "First City Monument Bank (FCMB)" },
  { value: "fidelity", label: "Fidelity Bank" },
  { value: "first_bank", label: "First Bank of Nigeria" },
  { value: "gtbank", label: "Guaranty Trust Bank (GTBank)" },
  { value: "heritage", label: "Heritage Bank" },
  { value: "keystone", label: "Keystone Bank" },
  { value: "opay", label: "OPay" },
  { value: "palmpay", label: "PalmPay" },
  { value: "polaris", label: "Polaris Bank" },
  { value: "providus", label: "Providus Bank" },
  { value: "stanbic", label: "Stanbic IBTC Bank" },
  { value: "sterling", label: "Sterling Bank" },
  { value: "uba", label: "United Bank for Africa (UBA)" },
  { value: "union", label: "Union Bank of Nigeria" },
  { value: "unity", label: "Unity Bank" },
  { value: "wema", label: "Wema Bank" },
  { value: "zenith", label: "Zenith Bank" },
];

interface FormData {
  businessName: string;
  description: string;
  pickupAddress: string;
  pickupCity: string;
  pickupState: string;
  govtIdFile: File | null;
  bankStatementFile: File | null;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

interface FileUploadAreaProps {
  label: string;
  hint: string;
  file: File | null;
  onFile: (f: File | null) => void;
  accept?: string;
}

function FileUploadArea({ label, hint, file, onFile, accept = "image/*,.pdf" }: FileUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <p className="mb-1.5 block text-sm font-medium text-slate">{label}</p>
      {file ? (
        <div className="flex items-center gap-3 rounded-[--radius-md] border border-emerald/40 bg-emerald/5 px-4 py-3">
          <FileText size={18} className="text-emerald shrink-0" />
          <span className="text-sm text-midnight font-medium truncate flex-1">{file.name}</span>
          <button
            type="button"
            onClick={() => onFile(null)}
            className="text-slate-lighter hover:text-error transition-colors"
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
          if (f) onFile(f);
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
  const [form, setForm] = useState<FormData>({
    businessName: "",
    description: "",
    pickupAddress: "",
    pickupCity: "",
    pickupState: "",
    govtIdFile: null,
    bankStatementFile: null,
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function canProceed(): boolean {
    if (step === 1)
      return !!form.businessName.trim() && !!form.pickupAddress.trim() && !!form.pickupState.trim();
    if (step === 2) return !!form.govtIdFile;
    if (step === 3)
      return !!form.bankName && !!form.accountNumber.trim() && !!form.accountName.trim();
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const uploadFile = async (file: File, path: string): Promise<string> => {
        const { error: uploadError } = await supabase.storage
          .from("kyc-documents")
          .upload(path, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("kyc-documents").getPublicUrl(path);
        return data.publicUrl;
      };

      const govtIdUrl = await uploadFile(
        form.govtIdFile!,
        `${user.id}/govt-id-${Date.now()}.${form.govtIdFile!.name.split(".").pop()}`
      );

      let bankStatementUrl: string | null = null;
      if (form.bankStatementFile) {
        bankStatementUrl = await uploadFile(
          form.bankStatementFile,
          `${user.id}/bank-statement-${Date.now()}.${form.bankStatementFile.name.split(".").pop()}`
        );
      }

      const { error: upsertError } = await supabase.from("sellers").upsert({
        user_id: user.id,
        business_name: form.businessName.trim(),
        description: form.description.trim() || null,
        pickup_address: form.pickupAddress.trim(),
        pickup_city: form.pickupCity.trim() || null,
        pickup_state: form.pickupState.trim(),
        kyc_govt_id_url: govtIdUrl,
        kyc_bank_statement_url: bankStatementUrl,
        bank_name: NIGERIAN_BANKS.find((b) => b.value === form.bankName)?.label || form.bankName,
        bank_account_number: form.accountNumber.trim(),
        bank_account_name: form.accountName.trim(),
        verification_status: "pending",
        updated_at: new Date().toISOString(),
      });

      if (upsertError) throw upsertError;

      router.push("/seller");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;

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
                className={`hidden sm:block text-xs font-medium ${
                  step >= s.id ? "text-midnight" : "text-slate-lighter"
                }`}
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
        <p className="text-xs text-slate-light text-right">
          Step {step} of {STEPS.length}
        </p>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step - 1].label}</CardTitle>
          <CardDescription>
            {step === 1 && "Tell buyers about your business."}
            {step === 2 && "Upload required identification documents for verification."}
            {step === 3 && "Add your bank account to receive payouts."}
            {step === 4 && "Review your details before submitting."}
          </CardDescription>
        </CardHeader>

        {/* Step 1: Business Info */}
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
              placeholder="Describe what you sell, your specialty, and why customers should choose you..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
            />
            <Input
              label="Pickup Address *"
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
          </div>
        )}

        {/* Step 2: KYC Documents */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="rounded-[--radius-md] bg-royal/8 border border-royal/20 px-4 py-3 flex gap-3">
              <AlertCircle size={16} className="text-royal mt-0.5 shrink-0" />
              <p className="text-sm text-royal">
                Accepted formats: JPEG, PNG, PDF. Max file size: 5 MB per document.
              </p>
            </div>
            <FileUploadArea
              label="Government-Issued ID *"
              hint="NIN slip, passport, voter's card, or driver's licence"
              file={form.govtIdFile}
              onFile={(f) => set("govtIdFile", f)}
            />
            <FileUploadArea
              label="Bank Statement (optional but recommended)"
              hint="Recent 3-month statement in PDF format"
              file={form.bankStatementFile}
              onFile={(f) => set("bankStatementFile", f)}
              accept=".pdf"
            />
          </div>
        )}

        {/* Step 3: Bank Account */}
        {step === 3 && (
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
              Payouts are processed every Friday. Ensure your account details are correct.
            </p>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="rounded-[--radius-md] border border-mist divide-y divide-mist overflow-hidden">
              <ReviewRow label="Business Name" value={form.businessName} />
              <ReviewRow label="Description" value={form.description || "—"} />
              <ReviewRow label="Pickup Address" value={`${form.pickupAddress}${form.pickupCity ? `, ${form.pickupCity}` : ""}${form.pickupState ? `, ${form.pickupState}` : ""}`} />
              <ReviewRow
                label="Government ID"
                value={form.govtIdFile ? form.govtIdFile.name : "Not uploaded"}
                badge={form.govtIdFile ? "success" : "error"}
              />
              <ReviewRow
                label="Bank Statement"
                value={form.bankStatementFile ? form.bankStatementFile.name : "Not uploaded"}
              />
              <ReviewRow
                label="Bank"
                value={`${NIGERIAN_BANKS.find((b) => b.value === form.bankName)?.label || form.bankName} — ${form.accountNumber}`}
              />
              <ReviewRow label="Account Name" value={form.accountName} />
            </div>
            {error && (
              <div className="flex items-start gap-2 rounded-[--radius-md] bg-error/8 border border-error/30 px-4 py-3">
                <AlertCircle size={16} className="text-error mt-0.5 shrink-0" />
                <p className="text-sm text-error">{error}</p>
              </div>
            )}
            <p className="text-xs text-slate-light">
              By submitting, you agree to Winipat's Seller Terms of Service. Your documents will be
              reviewed within 1–2 business days.
            </p>
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between gap-3">
        {step > 1 ? (
          <Button variant="outline" size="md" onClick={() => setStep((s) => s - 1)}>
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
            disabled={submitting}
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
