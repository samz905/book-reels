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
    <div className="bg-[#0F0E13] rounded-xl p-6 flex-1">
      <h2 className="text-white text-2xl font-bold mb-6">Payment Method</h2>

      {!isEditing ? (
        // Display mode
        <div className="flex flex-col h-[calc(100%-56px)] justify-between">
          <div className="flex items-center gap-3">
            {/* Visa logo */}
            <span className="text-[#172B85] font-bold text-lg tracking-wide bg-white px-2 py-0.5 rounded">
              VISA
            </span>
            <span className="text-white text-base">.... {lastFour}</span>
          </div>

          <button
            onClick={() => setIsEditing(true)}
            className="self-end px-4 py-2 rounded-lg border border-[#B8B6FC] text-[#B8B6FC] text-sm font-bold hover:bg-[#B8B6FC]/10 transition-colors"
          >
            Update Payment Method
          </button>
        </div>
      ) : (
        // Edit mode
        <div className="space-y-5">
          {/* Name field */}
          <div>
            <label className="text-[#ADADAD] text-[17px] leading-6 mb-3 block">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#262626] rounded-2xl px-4 py-4 text-white text-base font-semibold focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]"
            />
          </div>

          {/* Card number field */}
          <div>
            <label className="text-[#ADADAD] text-[17px] leading-6 mb-3 block">
              Card number
            </label>
            <div className="relative">
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full bg-[#262626] rounded-2xl px-4 py-4 text-white text-base focus:outline-none focus:ring-1 focus:ring-[#B8B6FC] pr-24"
              />
              {/* Card icons */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2.5">
                <span className="text-[#172B85] font-bold text-xs bg-white px-1.5 py-0.5 rounded">
                  VISA
                </span>
                <div className="flex">
                  <div className="w-5 h-5 rounded-full bg-[#EB001B]" />
                  <div className="w-5 h-5 rounded-full bg-[#F79E1B] -ml-2" />
                </div>
              </div>
            </div>
          </div>

          {/* Expiration and CVV row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[#ADADAD] text-[17px] leading-6 mb-3 block">
                Expiration date
              </label>
              <input
                type="text"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                placeholder="MM/YY"
                className="w-full bg-[#262626] rounded-2xl px-4 py-4 text-white text-base font-semibold placeholder:text-white placeholder:font-semibold focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]"
              />
            </div>
            <div>
              <label className="text-[#ADADAD] text-[17px] leading-6 mb-3 block">
                CVV
              </label>
              <input
                type="text"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                placeholder="CVV"
                className="w-full bg-[#262626] rounded-2xl px-4 py-4 text-white text-base font-semibold placeholder:text-white placeholder:font-semibold focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-[#ADADAD] text-sm font-bold hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-[#262550] border border-[#B8B6FC] text-[#B8B6FC] text-sm font-bold hover:bg-[#363580] transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
