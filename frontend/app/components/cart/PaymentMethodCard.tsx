"use client";

import { useState } from "react";

interface PaymentMethodCardProps {
  cardType?: "visa" | "mastercard";
  lastFour?: string;
}

export default function PaymentMethodCard({
  cardType = "visa",
  lastFour = "1234",
}: PaymentMethodCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("John Doe");
  const [cardNumber, setCardNumber] = useState("1234 1234 1234 1234");
  const [expiration, setExpiration] = useState("");
  const [cvv, setCvv] = useState("");

  const handleSave = () => {
    // TODO: Save payment method
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div className="bg-[#0F0E13] rounded-2xl p-6 flex-1">
      <h2 className="text-white text-2xl font-bold mb-6">Payment Method</h2>

      {!isEditing ? (
        // Display mode
        <div className="flex flex-col h-[calc(100%-56px)] justify-between">
          <div className="flex items-center gap-3">
            {/* Visa logo */}
            <span className="text-[#1A1F71] font-bold text-xl tracking-wide bg-white px-2 py-0.5 rounded">
              VISA
            </span>
            <span className="text-white text-base">.... {lastFour}</span>
          </div>

          <button
            onClick={() => setIsEditing(true)}
            className="self-end px-4 py-2 rounded-lg border border-[#B8B6FC] text-[#B8B6FC] text-sm font-medium hover:bg-[#B8B6FC]/10 transition-colors"
          >
            Update Payment Method
          </button>
        </div>
      ) : (
        // Edit mode
        <div className="space-y-4">
          {/* Name field */}
          <div>
            <label className="text-[#ADADAD] text-sm mb-2 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#212020] border border-[#303030] rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-[#B8B6FC]"
            />
          </div>

          {/* Card number field */}
          <div>
            <label className="text-[#ADADAD] text-sm mb-2 block">
              Card number
            </label>
            <div className="relative">
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full bg-[#212020] border border-[#303030] rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-[#B8B6FC] pr-24"
              />
              {/* Card icons */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-[#1A1F71] font-bold text-sm bg-white px-1.5 py-0.5 rounded">
                  VISA
                </span>
                <div className="w-8 h-5 rounded flex items-center justify-center">
                  <div className="flex">
                    <div className="w-3 h-3 rounded-full bg-[#EB001B] opacity-90" />
                    <div className="w-3 h-3 rounded-full bg-[#F79E1B] -ml-1.5 opacity-90" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expiration and CVV row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[#ADADAD] text-sm mb-2 block">
                Expiration date
              </label>
              <input
                type="text"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                placeholder="MM/YY"
                className="w-full bg-[#212020] border border-[#303030] rounded-lg px-4 py-3 text-white text-base placeholder:text-[#666] focus:outline-none focus:border-[#B8B6FC]"
              />
            </div>
            <div>
              <label className="text-[#ADADAD] text-sm mb-2 block">CVV</label>
              <input
                type="text"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                placeholder="CVV"
                className="w-full bg-[#212020] border border-[#303030] rounded-lg px-4 py-3 text-white text-base placeholder:text-[#666] focus:outline-none focus:border-[#B8B6FC]"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-4 pt-2">
            <button
              onClick={handleCancel}
              className="text-[#ADADAD] text-sm font-medium hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 rounded-lg border border-[#B8B6FC] text-[#B8B6FC] text-sm font-medium hover:bg-[#B8B6FC]/10 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
