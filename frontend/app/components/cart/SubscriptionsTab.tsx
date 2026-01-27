"use client";

import Image from "next/image";
import { CartSubscription } from "../../data/mockCartData";

interface SubscriptionsTabProps {
  subscriptions: CartSubscription[];
  onRemove: (id: string) => void;
}

const benefits = [
  "All episodes 5+ across every stories",
  "New episodes included automatically",
  "Access remains until end of billing period",
  "Cancel anytime any subscription individually from your Account",
  "You will be charged monthly for each creator you subscribe to",
];

export default function SubscriptionsTab({
  subscriptions,
  onRemove,
}: SubscriptionsTabProps) {
  return (
    <div className="bg-[#0F0E13] rounded-2xl p-6">
      {/* Header */}
      <h2 className="text-white text-2xl font-bold mb-2">Subscriptions</h2>
      <p className="text-[#ADADAD] text-base mb-6">
        What the subscriptions you are buying unlock for each creator
      </p>

      {/* Benefits grid - 2 columns */}
      <div className="grid grid-cols-2 gap-x-12 gap-y-3 mb-8">
        {benefits.map((benefit, index) => (
          <div key={index} className="flex items-start gap-2">
            {/* Green checkmark */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="flex-shrink-0 mt-0.5"
            >
              <path
                d="M16.6666 5L7.49998 14.1667L3.33331 10"
                stroke="#1ED760"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-white text-sm">{benefit}</span>
          </div>
        ))}
      </div>

      {/* Subscriptions table */}
      <div className="rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="bg-[#16151D] grid grid-cols-[1fr_150px_150px_60px] px-4 py-3">
          <span className="text-[#ADADAD] text-sm font-medium">Creator</span>
          <span className="text-[#ADADAD] text-sm font-medium">Price</span>
          <span className="text-[#ADADAD] text-sm font-medium">Renews</span>
          <span></span>
        </div>

        {/* Table rows */}
        {subscriptions.map((subscription) => (
          <div
            key={subscription.id}
            className="grid grid-cols-[1fr_150px_150px_60px] px-4 py-4 items-center border-b border-[#272727] last:border-b-0"
          >
            {/* Creator */}
            <div className="flex items-center gap-3">
              <Image
                src={subscription.creatorAvatar}
                alt={subscription.creatorName}
                width={40}
                height={40}
                className="rounded-full"
              />
              <span className="text-white text-sm font-medium">
                {subscription.creatorName}
              </span>
            </div>

            {/* Price */}
            <span className="text-white text-sm">
              ${subscription.price.toFixed(2)} / month
            </span>

            {/* Renews */}
            <span className="text-white text-sm">{subscription.renewsDate}</span>

            {/* Remove button */}
            <button
              onClick={() => onRemove(subscription.id)}
              className="w-9 h-9 rounded-full bg-[#3E3D40] flex items-center justify-center hover:bg-[#4E4D50] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ADADAD">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
