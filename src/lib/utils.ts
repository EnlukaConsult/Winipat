import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export type UserRole = "buyer" | "seller" | "admin" | "logistics";

export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "seller_preparing",
  "awaiting_pickup",
  "picked_up",
  "in_transit",
  "delivered",
  "completed",
  "dispute_opened",
  "refunded",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pending Payment",
  paid: "Paid",
  seller_preparing: "Seller Preparing",
  awaiting_pickup: "Awaiting Pickup",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  delivered: "Delivered",
  completed: "Completed",
  dispute_opened: "Dispute Opened",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

export const ESCROW_STATUSES = [
  "initiated",
  "authorized",
  "captured",
  "held",
  "release_eligible",
  "released",
  "refunded",
  "disputed",
] as const;

export type EscrowStatus = (typeof ESCROW_STATUSES)[number];
