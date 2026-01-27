"use client";

import Image from "next/image";
import { CartSubscription } from "../../data/mockCartData";

interface SubscriptionsTabProps {
  subscriptions: CartSubscription[];
  onRemove: (id: string) => void;
}

const benefitsLeft = [
  "All episodes 5+ across every stories",
  "New episodes included automatically",
  "Access remains until end of billing period",
];

const benefitsRight = [
  "Cancel anytime any subscription individually from your Account",
  "You will be charged monthly for each creator you subscribe to",
];

export default function SubscriptionsTab({
  subscriptions,
  onRemove,
}: SubscriptionsTabProps) {
  return (
    <div className="bg-[#0F0E13] rounded-xl p-6">
      {/* Header */}
      <h2 className="text-white text-2xl font-bold mb-3">Subscriptions</h2>
      <p className="text-white text-xl tracking-[-0.025em] mb-8">
        What the subscriptions you are buying unlock for each creator
      </p>

      {/* Benefits - 2 columns */}
      <div className="flex gap-24 mb-8">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {benefitsLeft.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2.5">
              {/* Green checkmark */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                <path
                  d="M9.55 18L3.85 12.3L5.275 10.875L9.55 15.15L18.725 5.975L20.15 7.4L9.55 18Z"
                  fill="#256B5F"
                />
              </svg>
              <span className="text-white text-xl tracking-[-0.025em]">{benefit}</span>
            </div>
          ))}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {benefitsRight.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2.5">
              {/* Green checkmark */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                <path
                  d="M9.55 18L3.85 12.3L5.275 10.875L9.55 15.15L18.725 5.975L20.15 7.4L9.55 18Z"
                  fill="#256B5F"
                />
              </svg>
              <span className="text-white text-xl tracking-[-0.025em]">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subscriptions table */}
      <div className="rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="bg-[#16151D] grid grid-cols-[1fr_180px_180px_60px] px-6 py-3">
          <span className="text-white text-base font-semibold">Creator</span>
          <span className="text-white text-base font-semibold">Price</span>
          <span className="text-white text-base font-semibold">Renews</span>
          <span></span>
        </div>

        {/* Table rows */}
        {subscriptions.map((subscription) => (
          <div
            key={subscription.id}
            className="grid grid-cols-[1fr_180px_180px_60px] px-6 py-4 items-center"
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
              <span className="text-white text-base font-medium">
                {subscription.creatorName}
              </span>
            </div>

            {/* Price */}
            <span className="text-white text-sm font-medium">
              ${subscription.price.toFixed(2)} / month
            </span>

            {/* Renews */}
            <span className="text-white text-xs">{subscription.renewsDate}</span>

            {/* Remove button */}
            <button
              onClick={() => onRemove(subscription.id)}
              className="w-9 h-9 rounded-full bg-[#3E3D40] flex items-center justify-center hover:bg-[#4E4D50] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8EAED">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
