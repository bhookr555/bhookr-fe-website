/**
 * Order row schema from the BHOOKR Orders sheet.
 * Mirrors the column headers returned by the Apps Script list endpoint.
 * Note: cell A1 of the live sheet has a typo "KI " — the API route normalises
 * it to "timestamp" before returning, so the UI sees a clean field.
 */

export interface OrderRow {
  timestamp: string | number;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | number;
  deliveryFullName?: string;
  deliveryPhone?: string | number;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryPinCode?: string | number;
  deliverySlot?: string;
  items: string;
  itemCount: number | string;
  subtotal: number | string;
  itemGST: number | string;
  deliveryBase: number | string;
  deliveryGST: number | string;
  grandTotal: number | string;
  paymentStatus: string;
  paymentId: string;
  paymentMethod: string;
  paymentTimestamp: string;
}

export interface OrdersApiResponse {
  success: boolean;
  rows: OrderRow[];
  total: number;
  error?: string;
}

export const ORDER_COLUMNS: {
  key: keyof OrderRow;
  label: string;
  width?: string;
  align?: "left" | "right";
}[] = [
  { key: "timestamp", label: "Order Time", width: "170px" },
  { key: "orderId", label: "Order ID", width: "240px" },
  { key: "customerName", label: "Customer", width: "150px" },
  { key: "customerEmail", label: "Email", width: "220px" },
  { key: "customerPhone", label: "Phone", width: "140px" },
  { key: "items", label: "Items", width: "320px" },
  { key: "itemCount", label: "Qty", width: "70px", align: "right" },
  { key: "grandTotal", label: "Total", width: "110px", align: "right" },
  { key: "subtotal", label: "Subtotal", width: "100px", align: "right" },
  { key: "deliveryBase", label: "Delivery", width: "100px", align: "right" },
  { key: "paymentStatus", label: "Payment", width: "120px" },
  { key: "paymentMethod", label: "Method", width: "100px" },
  { key: "paymentId", label: "Payment ID", width: "180px" },
  { key: "deliveryCity", label: "City", width: "120px" },
  { key: "deliveryState", label: "State", width: "120px" },
  { key: "deliveryAddress", label: "Address", width: "260px" },
];
