"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Copy, IndianRupee, Share2, X, Check, ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PaymentLinkModalProps {
  email: string;
  name: string;
  phone: string;
  onClose: () => void;
}

interface InvoiceLineItem {
  name: string;
  rate: number;
  taxRate: number; // 0, 5, or 18
}

export function PaymentLinkModal({
  email,
  name,
  phone,
  onClose,
}: PaymentLinkModalProps) {
  // Pre-fetch states
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // Form states
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState(() => new Date().toISOString().split("T")[0]); // default to same as issueDate

  // Selected item tracking
  const [selectedItemId, setSelectedItemId] = useState("custom");

  // Dynamic Line Items list
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { name: "", rate: 0, taxRate: 5 } // default empty row
  ]);

  // Discount (₹)
  const [discount, setDiscount] = useState("0");

  // Submission / success states
  const [loading, setLoading] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [finalInvoiceNo, setFinalInvoiceNo] = useState("");
  const [copied, setCopied] = useState(false);

  // Fetch initial next invoice sequence number and Razorpay items
  useEffect(() => {
    async function loadMetadata() {
      try {
        // 1. Fetch next invoice number
        const numRes = await fetch("/api/crm/payment/next-invoice-number");
        const numData = await numRes.json();
        if (numData.success && numData.nextInvoiceNumber) {
          setInvoiceNumber(String(numData.nextInvoiceNumber));
        }

        // 2. Fetch Razorpay items catalog
        const itemsRes = await fetch("/api/crm/payment/items");
        const itemsData = await itemsRes.json();
        if (itemsData.success && Array.isArray(itemsData.items)) {
          setCatalogItems(itemsData.items);
        }
      } catch (err) {
        console.error("Failed to load invoice metadata", err);
      } finally {
        setLoadingMetadata(false);
      }
    }
    loadMetadata();
  }, []);

  // Update expiryDate to match whenever issueDate is edited (if they match, keep them matching)
  const handleIssueDateChange = (newDate: string) => {
    setIssueDate(newDate);
    setExpiryDate(newDate);
  };

  // Sync selected catalog item with inputs
  const handleItemChange = (itemId: string) => {
    setSelectedItemId(itemId);
    if (itemId === "custom") {
      const updated = [...lineItems];
      updated[0] = { name: "", rate: 0, taxRate: 5 };
      setLineItems(updated);
    } else {
      const item = catalogItems.find((i) => i.id === itemId);
      if (item) {
        const updated = [...lineItems];
        const itemRate = (item.amount || 0) / 100;
        updated[0] = { name: item.name || "", rate: itemRate, taxRate: 5 };
        
        // Auto-detect plan type (elite vs standard) and set prefilled delivery charge row
        const lowerName = String(item.name).toLowerCase();
        const isElite = lowerName.includes("elite");
        const deliveryRate = isElite ? 1300 : 1000;
        
        // Check if delivery row exists
        const deliveryIdx = updated.findIndex(i => i.name.toLowerCase().includes("delivery"));
        if (deliveryIdx >= 0 && updated[deliveryIdx]) {
          updated[deliveryIdx].rate = deliveryRate;
        } else {
          updated.push({ name: "Delivery Charges", rate: deliveryRate, taxRate: 18 });
        }
        
        setLineItems(updated);
      }
    }
  };

  const handleLineItemChange = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updated = [...lineItems];
    const currentItem = updated[index];
    if (currentItem) {
      updated[index] = { ...currentItem, [field]: value } as InvoiceLineItem;
      setLineItems(updated);
    }
  };

  const addCustomItem = () => {
    setLineItems([...lineItems, { name: "", rate: 0, taxRate: 5 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) {
      toast.error("At least one line item is required");
      return;
    }
    const updated = [...lineItems];
    updated.splice(index, 1);
    setLineItems(updated);
  };

  // Live breakdown calculation
  const discountVal = Number(discount) || 0;
  
  let mealBase = 0;
  let mealCgst = 0;
  let mealSgst = 0;
  
  let deliveryBase = 0;
  let deliveryCgst = 0;
  let deliverySgst = 0;
  
  let otherBase = 0;
  let otherCgst = 0;
  let otherSgst = 0;
  
  lineItems.forEach((item, idx) => {
    const isDelivery = item.name.toLowerCase().includes("delivery");
    let itemRate = Number(item.rate) || 0;
    
    // Apply discount on the first line item only
    if (idx === 0) {
      itemRate = Math.max(0, itemRate - discountVal);
    }
    
    const ratePercentage = Number(item.taxRate) || 0;
    const cgst = ratePercentage > 0 ? Number((itemRate * (ratePercentage / 200)).toFixed(2)) : 0;
    const sgst = ratePercentage > 0 ? Number((itemRate * (ratePercentage / 200)).toFixed(2)) : 0;
    
    if (isDelivery) {
      deliveryBase += itemRate;
      deliveryCgst += cgst;
      deliverySgst += sgst;
    } else if (idx === 0) {
      mealBase += itemRate;
      mealCgst += cgst;
      mealSgst += sgst;
    } else {
      otherBase += itemRate;
      otherCgst += cgst;
      otherSgst += sgst;
    }
  });

  const totalMealTax = Number((mealCgst + mealSgst).toFixed(2));
  const totalDeliveryTax = Number((deliveryCgst + deliverySgst).toFixed(2));
  const totalOtherTax = Number((otherCgst + otherSgst).toFixed(2));
  
  const grandTotalPayable = mealBase + totalMealTax + deliveryBase + totalDeliveryTax + otherBase + totalOtherTax;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (lineItems.some(item => !item.name.trim())) {
      toast.error("Please enter item names for all lines");
      return;
    }
    if (lineItems.some(item => Number(item.rate) < 0)) {
      toast.error("Item rates cannot be negative");
      return;
    }
    if (lineItems[0] && discountVal > lineItems[0].rate) {
      toast.error("Discount cannot exceed the base plan price");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email,
        name,
        phone,
        invoiceNumber: invoiceNumber.trim() || undefined,
        discount: discountVal > 0 ? discountVal : undefined,
        issueDate: issueDate || undefined,
        expiryDate: expiryDate || undefined,
        lineItems: lineItems.map(item => ({
          name: item.name.trim(),
          rate: Number(item.rate),
          taxRate: Number(item.taxRate),
        })),
      };

      const res = await fetch("/api/crm/payment/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.shortUrl) {
        setShortUrl(data.shortUrl);
        setFinalInvoiceNo(data.invoiceNumber || invoiceNumber);
        toast.success(`Invoice ${data.invoiceNumber} created and issued!`);
      } else {
        toast.error(data.error || "Failed to generate invoice");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while generating the invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shortUrl) return;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      toast.success("Invoice URL copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy URL");
    }
  };

  const handleWhatsAppShare = () => {
    if (!shortUrl) return;
    const textMessage = `Hello ${name || "there"},\n\nHere is your tax invoice and secure payment request for the Bhookr fresh meal subscription:\n📄 Invoice #${finalInvoiceNo}\n👉 Payment Link: ${shortUrl}\n\nPlease click to complete the secure payment.\n\nThank you,\nTeam Bhookr`;
    
    const cleanedPhone = phone.replace(/\D/g, "");
    const whatsappPhone = cleanedPhone.length === 10 ? `91${cleanedPhone}` : cleanedPhone;
    
    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(textMessage)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-gray-900 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-250 px-5 py-4 dark:border-gray-800 shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Create & Issue Tax Invoice
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {name || "Customer"} · {email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loadingMetadata ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Fetching Razorpay Catalog & Invoice settings...
          </div>
        ) : !shortUrl ? (
          <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1">
            {/* Invoice Sequence & Date Configuration */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Invoice Number
                </label>
                <input
                  type="text"
                  placeholder="Auto-generated"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white outline-none focus:ring-1 focus:ring-red-500 font-semibold"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Issue Date
                </label>
                <input
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => handleIssueDateChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Expiry Date
                </label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-800" />

            {/* Catalog Items Selection */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Razorpay Catalog Item
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => handleItemChange(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="custom">✍️ Manual / Custom Item Entry</option>
                {catalogItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (₹{item.amount / 100})
                  </option>
                ))}
              </select>
            </div>

            {/* DYNAMIC LINE ITEMS GRID */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                <span>Invoice Line Items</span>
                <button
                  type="button"
                  onClick={addCustomItem}
                  className="text-xs font-bold text-[#E31E24] hover:text-[#C41E3A] transition flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Line
                </button>
              </div>

              <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-gray-50/50 dark:bg-gray-950/30">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800/60 font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 w-[110px]">Rate (₹)</th>
                      <th className="p-2.5 w-[100px]">Tax Rate</th>
                      <th className="p-2.5 w-[40px] text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-white/40 dark:hover:bg-gray-900/40">
                        <td className="p-2">
                          <input
                            type="text"
                            required
                            placeholder="e.g. Standard NV BF LUNCH"
                            value={item.name}
                            onChange={(e) => handleLineItemChange(idx, "name", e.target.value)}
                            className="w-full rounded border-0 bg-transparent px-2 py-1 outline-none focus:bg-white dark:focus:bg-gray-950 text-xs dark:text-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            required
                            placeholder="0"
                            value={item.rate || ""}
                            onChange={(e) => handleLineItemChange(idx, "rate", Number(e.target.value))}
                            className="w-full rounded border-0 bg-transparent px-2 py-1 outline-none focus:bg-white dark:focus:bg-gray-950 text-xs font-semibold dark:text-white"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={item.taxRate}
                            onChange={(e) => handleLineItemChange(idx, "taxRate", Number(e.target.value))}
                            className="w-full rounded border-0 bg-transparent px-1 py-1 outline-none focus:bg-white dark:focus:bg-gray-950 text-xs dark:text-white"
                          >
                            <option value="5">5% GST</option>
                            <option value="18">18% GST</option>
                            <option value="0">0% Tax</option>
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeLineItem(idx)}
                            className="text-gray-400 hover:text-red-500 transition"
                            title="Delete line"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Discount Offset */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-950/40 rounded-xl border border-gray-200 dark:border-gray-800">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Meal Plan Discount / Offer (₹)
              </label>
              <div className="relative max-w-[130px]">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-green-600">-</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-6 pr-2.5 text-xs dark:border-gray-700 dark:bg-gray-950 outline-none focus:ring-1 focus:ring-red-500 font-semibold text-green-600"
                />
              </div>
            </div>

            {/* LIVE RECEIPT BREAKDOWN */}
            <div className="p-4 bg-gray-50 dark:bg-gray-950/60 rounded-xl border border-gray-200 dark:border-gray-800 space-y-2.5 text-xs">
              <div className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">
                Live Invoice Receipt Breakdown
              </div>
              <div className="space-y-1.5 font-medium text-gray-600 dark:text-gray-400">
                {/* Meal Item */}
                <div className="flex justify-between">
                  <span>Base Meal Price:</span>
                  <span className="text-gray-900 dark:text-white">₹{Number(lineItems[0]?.rate || 0).toLocaleString()}</span>
                </div>
                {discountVal > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold">
                    <span>Applied Discount:</span>
                    <span>-₹{discountVal.toLocaleString()}</span>
                  </div>
                )}
                {discountVal > 0 && (
                  <div className="flex justify-between font-bold border-b border-dashed border-gray-250 dark:border-gray-800 pb-1.5">
                    <span>Net Meal Price:</span>
                    <span className="text-gray-900 dark:text-white">₹{mealBase.toLocaleString()}</span>
                  </div>
                )}
                {totalMealTax > 0 && (
                  <div className="flex justify-between text-[11px] pl-2 border-b border-dashed border-gray-250 dark:border-gray-800 pb-1.5 font-semibold text-gray-500">
                    <span>Meal GST (5%):</span>
                    <span>₹{totalMealTax.toLocaleString()}</span>
                  </div>
                )}

                {/* Delivery Charge */}
                {deliveryBase > 0 && (
                  <div className="flex justify-between pt-1">
                    <span>Base Delivery Charge:</span>
                    <span className="text-gray-900 dark:text-white">₹{deliveryBase.toLocaleString()}</span>
                  </div>
                )}
                {totalDeliveryTax > 0 && (
                  <div className="flex justify-between text-[11px] pl-2 border-b border-dashed border-gray-250 dark:border-gray-800 pb-1.5 font-semibold text-gray-500">
                    <span>Delivery GST (18%):</span>
                    <span>₹{totalDeliveryTax.toLocaleString()}</span>
                  </div>
                )}

                {/* Other Custom Items */}
                {otherBase > 0 && (
                  <div className="flex justify-between pt-1">
                    <span>Other Line Items:</span>
                    <span className="text-gray-900 dark:text-white">₹{otherBase.toLocaleString()}</span>
                  </div>
                )}
                {totalOtherTax > 0 && (
                  <div className="flex justify-between text-[11px] pl-2 border-b border-dashed border-gray-250 dark:border-gray-800 pb-1.5 font-semibold text-gray-500">
                    <span>Custom Items GST:</span>
                    <span>₹{totalOtherTax.toLocaleString()}</span>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white pt-1">
                  <span>Total Payable Amount:</span>
                  <span className="text-[#E31E24] text-base font-extrabold">₹{grandTotalPayable.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-250 pt-4 dark:border-gray-800 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-[#E31E24] hover:bg-[#C41E3A] px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 transition"
              >
                {loading ? "Issuing Invoice..." : "Create & Issue Invoice"}
              </button>
            </div>
          </form>
        ) : (
          /* Success display */
          <div className="p-5 space-y-5 shrink-0">
            <div className="text-center py-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                Tax Invoice Issued Successfully!
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Invoice #{finalInvoiceNo} is active and Razorpay has dispatched SMS/Email notifications.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Invoice Payment URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shortUrl}
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white select-all outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 transition"
                  title="Copy link"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition"
              >
                <Share2 className="h-4 w-4" />
                Share Invoice (WhatsApp)
              </button>
              <a
                href={shortUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 transition"
              >
                <ExternalLink className="h-4 w-4" />
                Preview Invoice
              </a>
            </div>

            <div className="flex justify-end border-t border-gray-250 pt-4 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-200 dark:hover:bg-gray-100 dark:text-gray-900 px-4 py-2 text-sm font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
