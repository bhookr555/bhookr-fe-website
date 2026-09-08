"use client";

import { Printer, X } from "lucide-react";

export interface ReceiptItem {
  name: string;
  subtitle?: string;
  qty: number;
  price: number;
}

export interface ReceiptData {
  customerName: string;
  mobile: string;
  deliveryDate: string;
  type?: string; // Pre-Order / Instant
  items: ReceiptItem[];
  itemsTotal: number;
  gstAmount: number;
  deliveryFee: number;
  total: number;
  amountPaid: number;
  dueAmount: number;
  deliveryZone?: string;
  orderId: string;
  recipeCodes?: string[];
}

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
}

export function ThermalReceiptModal({
  isOpen,
  onClose,
  receipt,
}: ThermalReceiptModalProps) {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:p-0 print:bg-transparent">
      {/* Modal Card - hidden during print */}
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900 print:hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Thermal Receipt Preview
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              POS Print Format (80mm width)
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Receipt Container Preview */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-6 dark:bg-gray-950 flex justify-center">
          <div className="w-[300px] bg-white p-5 shadow-md border border-gray-200 text-black font-mono text-xs rounded-sm">
            <ReceiptContent receipt={receipt} />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-[#E31E24] px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Print Receipt
          </button>
        </div>
      </div>

      {/* Actual Print Only Container (Visible strictly when printing) */}
      <div id="thermal-receipt-print" className="hidden print:block font-mono text-[11px] leading-tight text-black bg-white p-2 w-[76mm] mx-auto">
        <ReceiptContent receipt={receipt} />
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt-print,
          #thermal-receipt-print * {
            visibility: visible;
          }
          #thermal-receipt-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 4mm;
            background: #fff;
            color: #000;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}

function ReceiptContent({ receipt }: { receipt: ReceiptData }) {
  return (
    <div className="w-full space-y-2 text-black font-mono">
      {/* Brand Header */}
      <div className="text-center">
        <p className="text-[11px] font-normal italic tracking-wide text-gray-800">Hungry to be fit</p>
        <p className="text-[12px] font-bold uppercase tracking-tight leading-tight mt-0.5">
          BHOOKR CLOUD KITCHEN PRIVATE LIMITED
        </p>
      </div>

      <div className="border-b border-dashed border-gray-400 my-1.5" />

      {/* Customer Info */}
      <div className="space-y-0.5 text-[11px]">
        <div className="flex justify-between">
          <span className="w-20">Customer</span>
          <span>: {receipt.customerName || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="w-20">Mobile</span>
          <span>: {receipt.mobile || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="w-20">Delivery</span>
          <span>: {receipt.deliveryDate || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="w-20">Type</span>
          <span>: {receipt.type || "Pre-Order"}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-gray-400 my-1.5" />

      {/* Items Table Header */}
      <div>
        <div className="flex justify-between font-bold text-[11px] pb-1 border-b border-gray-800">
          <span className="flex-1 text-left uppercase">ITEMS</span>
          <span className="w-12 text-center uppercase">QTY</span>
          <span className="w-16 text-right uppercase">PRICE</span>
        </div>

        {/* Items Rows */}
        <div className="py-1.5 space-y-1.5">
          {receipt.items && receipt.items.length > 0 ? (
            receipt.items.map((item, i) => (
              <div key={i} className="text-[11px] leading-snug">
                <div className="flex justify-between items-start">
                  <span className="flex-1 pr-1 font-semibold">{item.name}</span>
                  <span className="w-12 text-center">{item.qty}</span>
                  <span className="w-16 text-right">₹{item.price.toFixed(2)}</span>
                </div>
                {item.subtitle && (
                  <p className="text-[10px] text-gray-600 pl-1">({item.subtitle})</p>
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-[10px] py-1 text-gray-500">Standard Meal Subscription</div>
          )}
        </div>
      </div>

      <div className="border-b border-dashed border-gray-400 my-1" />

      {/* Financial Summary */}
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span>Items Total</span>
          <span>: ₹{receipt.itemsTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>GST (5%)</span>
          <span>: ₹{receipt.gstAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Delivery</span>
          <span>: ₹{receipt.deliveryFee.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-[12px] font-bold pt-1 border-t border-gray-300">
          <span>TOTAL</span>
          <span>: ₹{receipt.total.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-[11px]">
          <span>AMOUNT PAID</span>
          <span>: ₹{receipt.amountPaid.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span>DUE</span>
          <span>: ₹{receipt.dueAmount.toFixed(2)}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-gray-400 my-1.5" />

      {/* Delivery Zone & Website */}
      <div className="text-[10px] space-y-1">
        <div className="flex justify-between items-center border border-gray-300 rounded px-1.5 py-0.5">
          <span className="font-semibold">Delivery Zone : {receipt.deliveryZone || "N/A"}</span>
          <span>www.bhookr.com</span>
        </div>
      </div>

      <div className="border-b border-dashed border-gray-400 my-1.5" />

      {/* Footer Order ID & Recipe Codes */}
      <div className="space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span>ORDER ID</span>
          <span>: {receipt.orderId || "—"}</span>
        </div>
        {receipt.recipeCodes && receipt.recipeCodes.length > 0 ? (
          receipt.recipeCodes.map((code, idx) => (
            <div key={idx} className="flex justify-between">
              <span>RECIPE CODE</span>
              <span>: {code}</span>
            </div>
          ))
        ) : (
          <div className="flex justify-between">
            <span>RECIPE CODE</span>
            <span>: BSI027</span>
          </div>
        )}
      </div>
    </div>
  );
}
