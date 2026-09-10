"use client";

import { Printer, X } from "lucide-react";

export interface ReceiptItem {
  name: string;
  subtitle?: string;
  qty: number;
  price?: number;
}

export interface ReceiptData {
  customerName: string;
  mobile: string;
  deliveryDate: string;
  type?: string; // Pre-Order / Instant
  items: ReceiptItem[];
  itemsTotal?: number;
  gstAmount?: number;
  deliveryFee?: number;
  total?: number;
  amountPaid?: number;
  dueAmount?: number;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md print:p-0 print:bg-transparent">
      {/* Modal Card - hidden during print */}
      <div className="flex max-h-[95vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900 print:hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Thermal Receipt Preview
            </h2>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Kitchen POS Label Format (100mm × 150mm)
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Receipt Container Preview */}
        <div className="flex-1 overflow-y-auto bg-gray-200 p-6 dark:bg-gray-950 flex justify-center items-center">
          <div className="w-[100mm] max-h-[150mm] overflow-hidden bg-white p-5 shadow-xl border border-gray-300 text-black font-mono text-xs rounded-sm box-border">
            <ReceiptContent receipt={receipt} />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-[#E31E24] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 shadow-md active:scale-98"
          >
            <Printer className="h-4 w-4" />
            Print Receipt
          </button>
        </div>
      </div>

      {/* Actual Print Only Container (Visible strictly when printing, forced to 1 page) */}
      <div id="thermal-receipt-print" className="hidden print:block font-mono text-xs leading-snug text-black bg-white p-4 w-[100mm] h-[150mm] max-h-[150mm] mx-auto box-border overflow-hidden">
        <ReceiptContent receipt={receipt} />
      </div>

      <style jsx global>{`
        @media print {
          html, body {
            width: 100mm !important;
            height: 150mm !important;
            max-height: 150mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #ffffff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt-print,
          #thermal-receipt-print * {
            visibility: visible !important;
          }
          #thermal-receipt-print {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100mm !important;
            max-width: 100mm !important;
            height: 150mm !important;
            max-height: 150mm !important;
            padding: 4mm 5mm !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          @page {
            size: 100mm 150mm;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}

function ReceiptContent({ receipt }: { receipt: ReceiptData }) {
  return (
    <div className="w-full space-y-2.5 text-black font-mono leading-tight max-h-[142mm] overflow-hidden">
      {/* Brand Header */}
      <div className="text-center space-y-0.5">
        <p className="text-[11px] font-normal italic tracking-wide text-gray-900">Hungry to be fit</p>
        <p className="text-sm font-extrabold uppercase tracking-tight leading-tight">
          BHOOKR CLOUD KITCHEN PRIVATE LIMITED
        </p>
      </div>

      <div className="border-b-2 border-dashed border-gray-800 my-1.5" />

      {/* Customer Info */}
      <div className="space-y-1 text-xs font-medium">
        <div className="flex justify-between">
          <span className="w-24 font-bold text-gray-900">Customer</span>
          <span className="font-bold flex-1 text-right truncate">: {receipt.customerName || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="w-24 font-bold text-gray-900">Mobile</span>
          <span className="font-semibold flex-1 text-right">: {receipt.mobile || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="w-24 font-bold text-gray-900">Delivery</span>
          <span className="font-semibold flex-1 text-right">: {receipt.deliveryDate || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="w-24 font-bold text-gray-900">Type</span>
          <span className="font-semibold flex-1 text-right">: {receipt.type || "Pre-Order"}</span>
        </div>
      </div>

      <div className="border-b-2 border-dashed border-gray-800 my-1.5" />

      {/* Items Table Header (No Pricing) */}
      <div>
        <div className="flex justify-between font-extrabold text-xs pb-1 border-b-2 border-black">
          <span className="flex-1 text-left uppercase">ITEMS</span>
          <span className="w-14 text-right uppercase">QTY</span>
        </div>

        {/* Items Rows */}
        <div className="py-1.5 space-y-1.5">
          {receipt.items && receipt.items.length > 0 ? (
            receipt.items.map((item, i) => (
              <div key={i} className="text-xs leading-snug">
                <div className="flex justify-between items-start font-bold">
                  <span className="flex-1 pr-2">{item.name}</span>
                  <span className="w-14 text-right font-extrabold text-sm">{item.qty}</span>
                </div>
                {item.subtitle && (
                  <p className="text-[11px] font-medium text-gray-800 pt-0.5">({item.subtitle})</p>
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-xs py-1 text-gray-800 font-medium">Standard Meal Subscription</div>
          )}
        </div>
      </div>

      <div className="border-b-2 border-dashed border-gray-800 my-1.5" />

      {/* Delivery Zone & Website */}
      <div className="text-xs space-y-1">
        <div className="flex justify-between items-center border-2 border-black rounded px-2 py-1 font-bold text-[11px]">
          <span>Zone: {receipt.deliveryZone || "N/A"}</span>
          <span>www.bhookr.com</span>
        </div>
      </div>

      <div className="border-b-2 border-dashed border-gray-800 my-1.5" />

      {/* Footer Order ID & Recipe Codes */}
      <div className="space-y-1 text-xs font-bold">
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



