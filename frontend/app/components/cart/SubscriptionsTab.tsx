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
    <div className="bg-panel rounded-xl p-4 sm:p-6">
      {/* Header */}
      <h2 className="text-white text-xl sm:text-2xl font-bold mb-3">Subscriptions</h2>
      <p className="text-white text-base md:text-xl tracking-[-0.025em] mb-6 md:mb-8">
        What the subscriptions you are buying unlock for each creator
      </p>

      {/* Benefits - stacked on mobile, 2 columns on desktop */}
      <div className="flex flex-col md:flex-row gap-5 md:gap-24 mb-6 md:mb-8">
        {/* Left column */}
        <div className="flex flex-col gap-4 md:gap-5">
          {benefitsLeft.map((benefit, index) => (
            <div key={index} className="flex items-start gap-2.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
                <path
                  d="M9.55 18L3.85 12.3L5.275 10.875L9.55 15.15L18.725 5.975L20.15 7.4L9.55 18Z"
                  fill="#256B5F"
                />
              </svg>
              <span className="text-white text-sm md:text-xl tracking-[-0.025em]">{benefit}</span>
            </div>
          ))}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 md:gap-5">
          {benefitsRight.map((benefit, index) => (
            <div key={index} className="flex items-start gap-2.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
                <path
                  d="M9.55 18L3.85 12.3L5.275 10.875L9.55 15.15L18.725 5.975L20.15 7.4L9.55 18Z"
                  fill="#256B5F"
                />
              </svg>
              <span className="text-white text-sm md:text-xl tracking-[-0.025em]">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subscriptions table */}
      <div className="rounded-lg overflow-hidden">
        {/* Desktop table header */}
        <div className="hidden md:grid bg-input-dark px-6 py-3 grid-cols-[1fr_180px_180px_60px]">
          <span className="text-white text-base font-semibold">Creator</span>
          <span className="text-white text-base font-semibold">Price</span>
          <span className="text-white text-base font-semibold">Renews</span>
          <span></span>
        </div>

        {/* Table rows */}
        {subscriptions.map((subscription) => (
          <div key={subscription.id}>
            {/* Desktop row */}
            <div className="hidden md:grid grid-cols-[1fr_180px_180px_60px] px-6 py-4 items-center">
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
              <span className="text-white text-sm font-medium">
                ${subscription.price.toFixed(2)} / month
              </span>
              <span className="text-white text-xs">{subscription.renewsDate}</span>
              <button
                onClick={() => onRemove(subscription.id)}
                className="w-9 h-9 rounded-full bg-[#3E3D40] flex items-center justify-center hover:bg-[#4E4D50] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8EAED">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
              </button>
            </div>

            {/* Mobile card */}
            <div className="md:hidden px-4 py-4 border-b border-[#272727] last:border-b-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src={subscription.creatorAvatar}
                    alt={subscription.creatorName}
                    width={36}
                    height={36}
                    className="rounded-full"
                  />
                  <div>
                    <span className="text-white text-sm font-medium block">
                      {subscription.creatorName}
                    </span>
                    <span className="text-[#ADADAD] text-xs">
                      ${subscription.price.toFixed(2)} / month
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onRemove(subscription.id)}
                  className="w-9 h-9 rounded-full bg-[#3E3D40] flex items-center justify-center hover:bg-[#4E4D50] transition-colors flex-shrink-0"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8EAED">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                </button>
              </div>
              {subscription.renewsDate && (
                <p className="text-[#ADADAD] text-xs mt-2 ml-[48px]">
                  Renews {subscription.renewsDate}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
