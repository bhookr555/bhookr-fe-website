"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Copy, IndianRupee, Share2, X, Check, ExternalLink, MapPin } from "lucide-react";
import { toast } from "sonner";

interface PaymentLinkModalProps {
  email: string;
  name: string;
  phone: string;
  onClose: () => void;
}

const INDIAN_STATES = [
  "Telangana",
  "Andhra Pradesh",
  "Karnataka",
  "Maharashtra",
  "Tamil Nadu",
  "Kerala",
  "Delhi",
  "Uttar Pradesh",
  "Gujarat",
  "Rajasthan",
  "Haryana",
  "Punjab",
  "West Bengal",
  "Bihar",
  "Madhya Pradesh"
];

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
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });

  // Selected item / custom description
  const [selectedItemId, setSelectedItemId] = useState("custom");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [planType, setPlanType] = useState("custom");

  // Discount & GST Apply
  const [discount, setDiscount] = useState("0");
  const [applyGst, setApplyGst] = useState(true);

  // Delivery charge
  const [addDeliveryCharge, setAddDeliveryCharge] = useState(true); // default checked
  const [deliveryCharge, setDeliveryCharge] = useState("1000"); // default standard delivery

  // Address
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("Hyderabad");
  const [state, setState] = useState("Telangana");
  const [zipcode, setZipcode] = useState("");

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

  // Sync selected catalog item with inputs
  const handleItemChange = (itemId: string) => {
    setSelectedItemId(itemId);
    if (itemId === "custom") {
      setDescription("");
      setAmount("");
      setPlanType("custom");
      setDeliveryCharge("1000"); // Default standard delivery fee
    } else {
      const item = catalogItems.find((i) => i.id === itemId);
      if (item) {
        setDescription(item.name || "");
        setAmount(String((item.amount || 0) / 100)); // paise to INR
        
        // Match planType dynamically based on name keywords
        const lowerName = String(item.name).toLowerCase();
        let plan = "custom";
        if (lowerName.includes("lite")) plan = "lite";
        else if (lowerName.includes("standard")) plan = "standard";
        else if (lowerName.includes("elite")) plan = "elite";
        else if (lowerName.includes("7 day") || lowerName.includes("week")) plan = "7_days";
        else if (lowerName.includes("monthly")) plan = "monthly";
        
        setPlanType(plan);

        // Autofill delivery fee based on plan
        if (plan === "elite") {
          setDeliveryCharge("1300");
        } else {
          setDeliveryCharge("1000");
        }
        setAddDeliveryCharge(true);
      }
    }
  };

  // Live breakdown calculation
  const mealBase = Number(amount) || 0;
  const discountVal = Number(discount) || 0;
  const netMealPrice = Math.max(0, mealBase - discountVal);
  
  // 5% GST on food (split as 2.5% CGST + 2.5% SGST)
  const mealCgst = applyGst ? Number((netMealPrice * 0.025).toFixed(2)) : 0;
  const mealSgst = applyGst ? Number((netMealPrice * 0.025).toFixed(2)) : 0;
  const totalMealTax = mealCgst + mealSgst;
  
  const deliveryBase = addDeliveryCharge ? (Number(deliveryCharge) || 0) : 0;
  
  // 18% GST on delivery (split as 9% CGST + 9% SGST)
  const deliveryCgst = (applyGst && deliveryBase > 0) ? Number((deliveryBase * 0.09).toFixed(2)) : 0;
  const deliverySgst = (applyGst && deliveryBase > 0) ? Number((deliveryBase * 0.09).toFixed(2)) : 0;
  const totalDeliveryTax = deliveryCgst + deliverySgst;
  
  const grandTotalPayable = netMealPrice + totalMealTax + deliveryBase + totalDeliveryTax;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (discountVal > mealBase) {
      toast.error("Discount cannot be greater than the meal price");
      return;
    }
    if (!line1.trim()) {
      toast.error("Please enter Street Address (Line 1)");
      return;
    }
    if (!zipcode.match(/^\d{6}$/)) {
      toast.error("Please enter a valid 6-digit PIN code");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email,
        name,
        phone,
        invoiceNumber: invoiceNumber.trim() || undefined,
        description: description.trim() || "Meals Subscription",
        planType,
        amount: Number(amount),
        discount: discountVal > 0 ? discountVal : undefined,
        applyGst,
        deliveryCharge: addDeliveryCharge ? Number(deliveryCharge) : undefined,
        issueDate: issueDate || undefined,
        expiryDate: expiryDate || undefined,
        billingAddress: {
          line1: line1.trim(),
          line2: line2.trim() || undefined,
          city: city.trim(),
          state,
          zipcode: zipcode.trim(),
        },
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
        <div className="flex items-center justify-between border-b border-gray-255 px-5 py-4 dark:border-gray-800 shrink-0">
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
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white outline-none focus:ring-1 focus:ring-red-500"
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
                  onChange={(e) => setIssueDate(e.target.value)}
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className={selectedItemId === "custom" ? "sm:col-span-1" : "sm:col-span-2"}>
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

              {selectedItemId === "custom" && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Plan Category
                  </label>
                  <select
                    value={planType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPlanType(val);
                      if (val === "elite") {
                        setDeliveryCharge("1300");
                      } else {
                        setDeliveryCharge("1000");
                      }
                    }}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="custom">Standard / Custom Meal Plan</option>
                    <option value="elite">Elite Meal Plan</option>
                  </select>
                </div>
              )}
            </div>

            {/* Description, Cost & Discount */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  Item Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard NV BF LUNCH"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={selectedItemId !== "custom"}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white outline-none focus:ring-1 focus:ring-red-500 text-ellipsis"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  Rate / Price (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    inputMode="decimal"
                    min="1"
                    required
                    placeholder="500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={selectedItemId !== "custom"}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  Discount (₹)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-green-600">-</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-7 pr-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white outline-none focus:ring-1 focus:ring-red-500 font-semibold text-green-600"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Charges Control */}
            <div className="p-3 bg-gray-50 dark:bg-gray-950/40 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={addDeliveryCharge}
                    onChange={(e) => setAddDeliveryCharge(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#E31E24] focus:ring-[#E31E24]"
                  />
                  Include Delivery Charges
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={applyGst}
                    onChange={(e) => setApplyGst(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#E31E24] focus:ring-[#E31E24]"
                  />
                  Apply GST (Meals & Delivery)
                </label>
              </div>

              {addDeliveryCharge && (
                <div className="flex items-center gap-3">
                  <div className="relative max-w-[150px]">
                    <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      placeholder="1000"
                      required
                      value={deliveryCharge}
                      onChange={(e) => setDeliveryCharge(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-2.5 text-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-gray-500">
                    Base charge. GST (18%) is computed on top of this.
                  </span>
                </div>
              )}
            </div>

            {/* LIVE BREAKDOWN CARD */}
            <div className="p-4 bg-gray-50 dark:bg-gray-950/60 rounded-xl border border-gray-200 dark:border-gray-800 space-y-2.5 text-xs">
              <div className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">
                Live Invoice Receipt Breakdown
              </div>
              <div className="space-y-1.5 font-medium text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Base Meal Price:</span>
                  <span className="text-gray-900 dark:text-white">₹{mealBase.toLocaleString()}</span>
                </div>
                {discountVal > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold">
                    <span>Applied Discount:</span>
                    <span>-₹{discountVal.toLocaleString()}</span>
                  </div>
                )}
                {discountVal > 0 && (
                  <div className="flex justify-between font-bold border-b border-dashed border-gray-200 dark:border-gray-800 pb-1.5">
                    <span>Net Meal Price:</span>
                    <span className="text-gray-900 dark:text-white">₹{netMealPrice.toLocaleString()}</span>
                  </div>
                )}
                {applyGst && netMealPrice > 0 && (
                  <>
                    <div className="flex justify-between text-[11px] pl-2">
                      <span>Meal CGST (2.5%):</span>
                      <span>₹{mealCgst.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px] pl-2 border-b border-dashed border-gray-200 dark:border-gray-800 pb-1.5">
                      <span>Meal SGST (2.5%):</span>
                      <span>₹{mealSgst.toLocaleString()}</span>
                    </div>
                  </>
                )}
                {deliveryBase > 0 && (
                  <div className="flex justify-between pt-1">
                    <span>Base Delivery Charge:</span>
                    <span className="text-gray-900 dark:text-white">₹{deliveryBase.toLocaleString()}</span>
                  </div>
                )}
                {applyGst && deliveryBase > 0 && (
                  <>
                    <div className="flex justify-between text-[11px] pl-2">
                      <span>Delivery CGST (9%):</span>
                      <span>₹{deliveryCgst.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px] pl-2 border-b border-dashed border-gray-200 dark:border-gray-800 pb-1.5">
                      <span>Delivery SGST (9%):</span>
                      <span>₹{deliverySgst.toLocaleString()}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white pt-1">
                  <span>Total Payable Amount:</span>
                  <span className="text-[#E31E24] text-base">₹{grandTotalPayable.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-800" />

            {/* Address Form (Billing / Shipping) */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                <MapPin className="h-4 w-4 text-red-500" />
                Customer Address (Billing & Shipping)
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] text-gray-500 dark:text-gray-400">
                    Street Address (Line 1)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Flat / House No, Building, Street"
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] text-gray-500 dark:text-gray-400">
                    Landmark / Area (Line 2)
                  </label>
                  <input
                    type="text"
                    placeholder="Near temple, Gachibowli (optional)"
                    value={line2}
                    onChange={(e) => setLine2(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] text-gray-500 dark:text-gray-400">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] text-gray-500 dark:text-gray-400">
                    PIN Code (Zip)
                  </label>
                  <input
                    type="text"
                    required
                    pattern="\d{6}"
                    placeholder="500032"
                    value={zipcode}
                    onChange={(e) => setZipcode(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] text-gray-500 dark:text-gray-400">
                    State (Place of Supply)
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white outline-none focus:ring-1 focus:ring-red-500"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
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
