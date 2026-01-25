"use client";

import { useState } from "react";
import { Subscription, formatCurrency } from "@/app/data/mockCreatorData";

interface SubscriptionCardProps {
  subscription: Subscription;
  onUpdate: (subscription: Subscription) => void;
}

export default function SubscriptionCard({
  subscription,
  onUpdate,
}: SubscriptionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [enabled, setEnabled] = useState(subscription.enabled);
  const [price, setPrice] = useState(subscription.monthlyPrice.toString());

  const handleToggle = () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    if (!newEnabled) {
      // If disabling, save immediately
      onUpdate({ ...subscription, enabled: false, monthlyPrice: 0 });
      setPrice("0");
      setIsEditing(false);
    } else {
      // If enabling, enter edit mode
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    const numPrice = parseFloat(price) || 0;
    onUpdate({
      ...subscription,
      enabled,
      monthlyPrice: numPrice,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEnabled(subscription.enabled);
    setPrice(subscription.monthlyPrice.toString());
    setIsEditing(false);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const minPrice = enabled ? 4.99 : 0;

  return (
    <div className="bg-card-bg-1 rounded-2xl p-6">
      {/* Header with toggle */}
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-white text-xl font-semibold">Subscription</h2>
        <button
          onClick={handleToggle}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            enabled ? "bg-green-500" : "bg-card-bg-3"
          }`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              enabled ? "left-6" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <div className="flex gap-6">
        {/* Monthly Price */}
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-3">Monthly Price</h3>
          {isEditing ? (
            <input
              type="text"
              value={`$${price}`}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, "");
                setPrice(val);
              }}
              className="w-full bg-card-bg-2 border border-border rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-purple"
            />
          ) : (
            <p className="text-white text-2xl font-semibold">
              {formatCurrency(subscription.monthlyPrice)}
            </p>
          )}
          <p className="text-white/50 text-sm mt-2">
            Minimum price is {formatCurrency(minPrice)}
          </p>
        </div>

        {/* Divider */}
        <div className="w-px bg-border" />

        {/* Description */}
        <div className="flex-1">
          <p className="text-white/70">
            Subscribers unlock all episodes across every active story, including
            future releases.
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end mt-4">
        {isEditing ? (
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="px-6 py-2 text-white/70 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 rounded-lg font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)",
              }}
            >
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={handleEditClick}
            className="p-2 bg-card-bg-3 rounded-full hover:bg-card-bg-4 transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-white"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
