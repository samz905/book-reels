"use client";

interface OrderSummaryProps {
  itemCount: number;
  itemType: "subscriptions" | "ebooks";
  subtotal: number;
  total: number;
  onCompletePurchase: () => void;
}

export default function OrderSummary({
  itemCount,
  itemType,
  subtotal,
  total,
  onCompletePurchase,
}: OrderSummaryProps) {
  const itemLabel =
    itemType === "subscriptions"
      ? `${itemCount} Subscription${itemCount !== 1 ? "s" : ""}`
      : `${itemCount} Ebook${itemCount !== 1 ? "s" : ""}`;

  const priceLabel =
    itemType === "subscriptions"
      ? `$${subtotal.toFixed(2)} / month`
      : `$${subtotal.toFixed(2)}`;

  return (
    <div className="bg-[#0F0E13] rounded-2xl p-6 flex-1">
      <h2 className="text-white text-2xl font-bold mb-6">Order Summary</h2>

      {/* Item line */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-white text-base">{itemLabel}</span>
        <span className="text-white text-base">{priceLabel}</span>
      </div>

      {/* Total line */}
      <div className="flex items-center justify-between mb-8">
        <span className="text-[#ADADAD] text-base uppercase tracking-wide">
          Total Due Today
        </span>
        <span className="text-white text-2xl font-bold">
          ${total.toFixed(2)}
        </span>
      </div>

      {/* Complete Purchase button */}
      <button
        onClick={onCompletePurchase}
        className="w-full py-3 rounded-lg text-white font-semibold text-base"
        style={{
          background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)",
        }}
      >
        Complete Purchase
      </button>
    </div>
  );
}
