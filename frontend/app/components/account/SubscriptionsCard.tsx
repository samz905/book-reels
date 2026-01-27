"use client";

import Image from "next/image";
import Link from "next/link";
import { Subscription } from "../../data/mockAccountData";

interface SubscriptionsCardProps {
  subscriptions: Subscription[];
  onUnsubscribe?: (subscriptionId: string) => void;
  onSubscribe?: (subscriptionId: string) => void;
}

export default function SubscriptionsCard({
  subscriptions,
  onUnsubscribe,
  onSubscribe,
}: SubscriptionsCardProps) {
  return (
    <div className="bg-[#0F0E13] rounded-2xl overflow-hidden">
      <h2 className="text-white text-2xl font-bold p-6 pb-4">Subscriptions</h2>

      {/* Table Header */}
      <div className="bg-[#16151D] px-6 py-3 grid grid-cols-[1fr_1fr_1fr_1fr_1fr] items-center">
        <span className="text-white text-base font-semibold">Creator</span>
        <span className="text-white text-base font-semibold">Price</span>
        <span className="text-white text-base font-semibold">Status</span>
        <span className="text-white text-base font-semibold">Next Billing</span>
        <span className="text-white text-base font-semibold">Manage</span>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-[#272727]">
        {subscriptions.map((subscription) => (
          <div
            key={subscription.id}
            className="px-6 py-4 grid grid-cols-[1fr_1fr_1fr_1fr_1fr] items-center"
          >
            {/* Creator */}
            <Link
              href={`/creator/${subscription.creatorUsername}`}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-[#272727] flex-shrink-0">
                <Image
                  src={subscription.creatorAvatar}
                  alt={subscription.creatorName}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-white text-base font-medium">
                {subscription.creatorName}
              </span>
            </Link>

            {/* Price */}
            <span className="text-white text-sm font-medium">
              ${subscription.price.toFixed(2)} / month
            </span>

            {/* Status */}
            <div>
              {subscription.status === "active" ? (
                <span className="inline-block px-4 py-1.5 bg-[#256B5F] rounded-full text-white text-xs font-bold uppercase">
                  Active
                </span>
              ) : (
                <span className="inline-block px-4 py-1.5 bg-[#ADADAD] rounded-full text-black text-xs font-semibold uppercase">
                  Canceled
                </span>
              )}
            </div>

            {/* Next Billing */}
            <span className="text-white text-xs font-normal">
              {subscription.nextBilling || "-"}
            </span>

            {/* Manage */}
            {subscription.status === "active" ? (
              <button
                onClick={() => onUnsubscribe?.(subscription.id)}
                className="px-4 py-2 bg-[#262550] border border-purple text-purple text-sm font-bold rounded-lg hover:bg-purple/20 transition-colors w-fit"
              >
                Unsubscribe
              </button>
            ) : (
              <button
                onClick={() => onSubscribe?.(subscription.id)}
                className="px-4 py-2 bg-[#262550] border border-purple text-purple text-sm font-bold rounded-lg hover:bg-purple/20 transition-colors w-fit"
              >
                Subscribe
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
