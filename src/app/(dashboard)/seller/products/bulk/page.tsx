"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
  Info,
} from "lucide-react";
import Link from "next/link";

type ParsedRow = {
  name: string;
  description: string;
  price_naira: string;
  stock: string;
  category_slug: string;
};

type RowError = { index: number; error: string };

const REQUIRED_COLUMNS = ["name", "description", "price_naira", "stock", "category_slug"];

// Minimal CSV parser — handles double-quoted fields with embedded commas
// and "" escape. Trims BOM. No external dep so we don't bloat the bundle
// for a feature most sellers use once.
function parseCSV(text: string): string[][] {
  text = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export default function BulkProductsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [filename, setFilename] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: RowError[] } | null>(null);
  const [categorySlugs, setCategorySlugs] = useState<string[]>([]);

  useEffect(() => {
    async function loadCats() {
      const supabase = createClient();
      const { data } = await supabase.from("categories").select("slug");
      setCategorySlugs((data || []).map((c) => c.slug));
    }
    loadCats();
  }, []);

  const downloadTemplate = useCallback(() => {
    const sample = [
      REQUIRED_COLUMNS.join(","),
      'Handwoven Aso-Oke Bag,Premium handwoven leather bag,15000,12,fashion',
      'Yoruba Talking Drum,"Traditional, hand-tuned drum",28000,5,music-instruments',
    ].join("\n");
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "winipat-products-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  function handleFile(file: File) {
    setResult(null);
    setParseErrors([]);
    setFilename(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const grid = parseCSV(text);
      if (grid.length < 2) {
        setParseErrors(["File appears empty. Need at least a header row + 1 data row."]);
        setRows([]);
        return;
      }
      const header = grid[0].map((h) => h.trim().toLowerCase());
      const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
      if (missing.length) {
        setParseErrors([`Missing required columns: ${missing.join(", ")}`]);
        setRows([]);
        return;
      }

      const idx = Object.fromEntries(
        REQUIRED_COLUMNS.map((c) => [c, header.indexOf(c)])
      );

      const parsed: ParsedRow[] = grid.slice(1).map((r) => ({
        name:          (r[idx.name] || "").trim(),
        description:   (r[idx.description] || "").trim(),
        price_naira:   (r[idx.price_naira] || "").trim(),
        stock:         (r[idx.stock] || "").trim(),
        category_slug: (r[idx.category_slug] || "").trim(),
      }));

      setRows(parsed);
    };
    reader.readAsText(file);
  }

  // Pre-flight row validation (mirrors the API checks so the user can
  // fix issues without burning a round-trip).
  const previewErrors: RowError[] = rows.flatMap((r, i) => {
    const errs: RowError[] = [];
    if (!r.name) errs.push({ index: i, error: "name is required" });
    const p = parseFloat(r.price_naira);
    if (!Number.isFinite(p) || p <= 0)
      errs.push({ index: i, error: "price_naira must be > 0" });
    const s = parseFloat(r.stock);
    if (!Number.isFinite(s) || s < 0)
      errs.push({ index: i, error: "stock must be >= 0" });
    if (categorySlugs.length && !categorySlugs.includes(r.category_slug))
      errs.push({ index: i, error: `unknown category_slug "${r.category_slug}"` });
    return errs;
  });

  async function submit() {
    if (rows.length === 0) return;
    setSubmitting(true);
    setResult(null);
    const body = {
      rows: rows.map((r) => ({
        name: r.name,
        description: r.description,
        price_naira: parseFloat(r.price_naira),
        stock: parseInt(r.stock, 10) || 0,
        category_slug: r.category_slug,
      })),
    };
    const res = await fetch("/api/seller/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Upload failed");
      return;
    }
    setResult({ created: data.created || 0, errors: data.errors || [] });
    if (data.created > 0 && (!data.errors || data.errors.length === 0)) {
      setTimeout(() => router.push("/seller/products"), 1500);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
            Bulk Upload Products
          </h1>
          <p className="mt-0.5 text-sm text-slate-light">
            Upload a CSV to create multiple products as drafts. Add images and
            publish from the{" "}
            <Link href="/seller/products" className="text-violet hover:underline">
              products page
            </Link>
            .
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download size={14} className="mr-1.5" />
          Template
        </Button>
      </div>

      <Card padding="md">
        <CardTitle className="text-sm flex items-center gap-2 mb-1">
          <Info size={14} className="text-violet" />
          CSV format
        </CardTitle>
        <CardDescription className="text-xs">
          Columns (case-insensitive): <code>name</code>, <code>description</code>,{" "}
          <code>price_naira</code>, <code>stock</code>, <code>category_slug</code>.
          Quote fields containing commas. Max 500 rows per upload. Created
          products start as <Badge variant="default" className="text-[10px]">draft</Badge>.
        </CardDescription>
      </Card>

      <div
        className="rounded-[--radius-xl] border-2 border-dashed border-mist bg-white p-10 text-center cursor-pointer hover:border-violet/40"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <Upload className="mx-auto mb-3 text-violet" size={32} />
        <p className="text-sm font-medium text-midnight">
          {filename ? filename : "Drop a CSV here or click to pick"}
        </p>
        <p className="text-xs text-slate-lighter mt-1">
          We&apos;ll show a preview before anything is created.
        </p>
      </div>

      {parseErrors.length > 0 && (
        <div className="rounded-[--radius-md] bg-error/8 border border-error/20 px-4 py-3 space-y-1">
          {parseErrors.map((e, i) => (
            <p key={i} className="text-sm text-error flex items-center gap-2">
              <AlertTriangle size={14} />
              {e}
            </p>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <Card padding="sm">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-violet" />
              Preview · {rows.length} row{rows.length !== 1 ? "s" : ""}
              {previewErrors.length > 0 && (
                <Badge variant="error" className="text-[10px]">
                  {previewErrors.length} issue
                  {previewErrors.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRows([]);
                setFilename(null);
              }}
            >
              <X size={14} className="mr-1.5" />
              Clear
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="text-slate-lighter uppercase">
                <tr className="border-b border-mist">
                  <th className="text-left py-2 px-2 w-10">#</th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2">Description</th>
                  <th className="text-right py-2 px-2">Price ₦</th>
                  <th className="text-right py-2 px-2">Stock</th>
                  <th className="text-left py-2 px-2">Category</th>
                  <th className="text-left py-2 px-2">Issue</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const errs = previewErrors.filter((e) => e.index === i);
                  const bad = errs.length > 0;
                  return (
                    <tr
                      key={i}
                      className={
                        bad
                          ? "border-b border-error/20 bg-error/5"
                          : "border-b border-mist/60"
                      }
                    >
                      <td className="py-2 px-2 text-slate-lighter">{i + 1}</td>
                      <td className="py-2 px-2 font-medium text-midnight">
                        {r.name || <span className="text-error">—</span>}
                      </td>
                      <td className="py-2 px-2 text-slate max-w-xs truncate">
                        {r.description}
                      </td>
                      <td className="py-2 px-2 text-right">{r.price_naira}</td>
                      <td className="py-2 px-2 text-right">{r.stock}</td>
                      <td className="py-2 px-2 text-slate">{r.category_slug}</td>
                      <td className="py-2 px-2 text-error">
                        {errs.map((e) => e.error).join("; ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="primary"
              size="sm"
              loading={submitting}
              disabled={previewErrors.length > 0 || rows.length === 0}
              onClick={submit}
            >
              <CheckCircle2 size={14} className="mr-1.5" />
              Create {rows.length - previewErrors.length} product
              {rows.length - previewErrors.length !== 1 ? "s" : ""} as draft
            </Button>
          </div>
        </Card>
      )}

      {result && (
        <div
          className={
            result.errors.length === 0
              ? "rounded-[--radius-md] bg-emerald/10 border border-emerald/30 px-4 py-3"
              : "rounded-[--radius-md] bg-warn/10 border border-warn/30 px-4 py-3"
          }
        >
          <p className="text-sm font-medium text-midnight">
            Created {result.created} product{result.created !== 1 ? "s" : ""} as
            drafts.
            {result.errors.length > 0 &&
              ` ${result.errors.length} row${result.errors.length !== 1 ? "s" : ""} skipped.`}
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 text-xs text-slate space-y-0.5">
              {result.errors.map((e, i) => (
                <li key={i}>
                  Row {e.index + 1}: {e.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
