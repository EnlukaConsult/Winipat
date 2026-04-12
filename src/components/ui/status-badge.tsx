import { Badge } from "./badge";
import type { OrderStatus } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "gold" | "royal";

const statusVariants: Record<OrderStatus, BadgeVariant> = {
  pending_payment: "warning",
  paid: "info",
  seller_preparing: "royal",
  awaiting_pickup: "gold",
  picked_up: "info",
  in_transit: "royal",
  delivered: "success",
  completed: "success",
  dispute_opened: "error",
  refunded: "warning",
  cancelled: "error",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={statusVariants[status]}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
