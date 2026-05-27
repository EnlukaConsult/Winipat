"use client";

import Link from "next/link";
import {
  Pencil,
  PauseCircle,
  PlayCircle,
  Trash2,
  ImageIcon,
  ExternalLink,
  Loader2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { formatNaira } from "@/lib/utils";

export type ProductStatus = "active" | "draft" | "paused" | "removed";

export type SellerProductCardData = {
  id: string;
  name: string;
  price: number;              // kobo
  stock_quantity: number;
  status: ProductStatus;
  thumbnail: string | null;
  categoryName: string | null;
};

type ProductCardProps = {
  product: SellerProductCardData;
  /** True while a status toggle / delete is mid-flight. */
  busy?: boolean;
  onToggleStatus: (p: SellerProductCardData) => void;
  onDelete: (p: SellerProductCardData) => void;
  /** When the public storefront / product page can be linked to. */
  publicHref?: string | null;
};

// Media-first seller product card. Replaces the older mini-card that
// felt admin-table-ish. Big square thumbnail (the centerpiece), clean
// price + stock row, single primary action ("Edit") plus quiet icon
// buttons for the secondary actions, status pill stacked top-right.
export function SellerProductCard({
  product,
  busy,
  onToggleStatus,
  onDelete,
  publicHref,
}: ProductCardProps) {
  const status = STATUS_META[product.status];
  const isActive = product.status === "active";
  const lowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
  const outOfStock = product.stock_quantity === 0;

  return (
    <article
      className="group relative rounded-2xl border border-mist bg-white overflow-hidden hover:border-violet/30 hover:shadow-[0_8px_24px_-12px_rgba(124,58,237,0.25)] transition-all"
    >
      {/* Thumbnail — full bleed, square, hover zoom for the photo */}
      <div className="relative aspect-square bg-cloud overflow-hidden">
        {product.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.thumbnail}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-mist to-cloud">
            <ImageIcon
              size={32}
              className="text-slate-lighter"
              aria-hidden="true"
            />
          </div>
        )}

        {/* Status pill + stock alert overlay */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2 pointer-events-none">
          <span
            className={`pointer-events-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.fg}`}
          >
            {status.label}
          </span>

          {outOfStock ? (
            <span className="pointer-events-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
              <AlertCircle className="h-2.5 w-2.5" aria-hidden="true" />
              Sold out
            </span>
          ) : lowStock ? (
            <span className="pointer-events-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
              Low · {product.stock_quantity}
            </span>
          ) : null}
        </div>

        {/* Public link button — only shown for active products */}
        {publicHref && isActive && (
          <Link
            href={publicHref}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2.5 right-2.5 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/95 text-violet hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            title="View public listing"
            aria-label="View public listing"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-2.5">
        <div className="min-h-[44px]">
          <h3 className="font-semibold text-midnight text-sm leading-snug line-clamp-2">
            {product.name}
          </h3>
          {product.categoryName && (
            <p className="text-[11px] text-slate-light mt-0.5 uppercase tracking-wider font-bold">
              {product.categoryName}
            </p>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <p className="font-[family-name:var(--font-sora)] text-[17px] font-bold text-midnight">
            {formatNaira(product.price / 100)}
          </p>
          <p className="text-xs text-slate-light">
            {product.stock_quantity.toLocaleString()} in stock
          </p>
        </div>

        {/* Actions row */}
        <div className="flex items-stretch gap-1.5 pt-1">
          <Link
            href={`/seller/products/${product.id}/edit`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-violet/30 bg-violet/5 text-violet text-xs font-bold hover:bg-violet/10 transition-colors"
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
            Edit
          </Link>

          <button
            type="button"
            onClick={() => onToggleStatus(product)}
            disabled={busy || product.status === "draft"}
            title={
              product.status === "draft"
                ? "Drafts must be published from the edit page"
                : isActive
                ? "Pause this listing"
                : "Activate this listing"
            }
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-mist bg-white text-slate hover:border-mist-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label={isActive ? "Pause product" : "Activate product"}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : isActive ? (
              <PauseCircle className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
            ) : (
              <PlayCircle className="h-3.5 w-3.5 text-emerald-dark" aria-hidden="true" />
            )}
          </button>

          {publicHref && isActive && (
            <Link
              href={publicHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-lg border border-mist bg-white text-slate hover:border-mist-dark transition-colors"
              aria-label="View public listing"
              title="View public listing"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => onDelete(product)}
            disabled={busy}
            title="Delete product"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-mist bg-white text-slate hover:border-error/30 hover:bg-error/5 hover:text-error disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Delete product"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

const STATUS_META: Record<
  ProductStatus,
  { label: string; bg: string; fg: string }
> = {
  active:  { label: "Active",  bg: "bg-emerald/15 backdrop-blur",   fg: "text-emerald-dark" },
  draft:   { label: "Draft",   bg: "bg-white/90 backdrop-blur",     fg: "text-slate" },
  paused:  { label: "Paused",  bg: "bg-warning/15 backdrop-blur",   fg: "text-amber-600" },
  removed: { label: "Removed", bg: "bg-error/15 backdrop-blur",     fg: "text-error" },
};
