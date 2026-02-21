"use client";

import Image from "next/image";
import Link from "next/link";
import { Subscription } from "../../data/mockAccountData";

interface SubscriptionsCardProps {
  subscriptions: Subscription[];
  isLoading?: boolean;
  onUnsubscribe?: (subscriptionId: string) => void;
  onSubscribe?: (subscriptionId: string) => void;
  onRemove?: (subscriptionId: string) => void;
}

function CreatorAvatar({ name, src }: { name: string; src: string }) {
  if (!src) {
    const initials = name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return (
      <div className="w-10 h-10 rounded-full bg-[#3E3D40] flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-bold">{initials}</span>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full overflow-hidden bg-[#272727] flex-shrink-0">
      <Image
        src={src}
        alt={name}
        width={40}
        height={40}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export default function SubscriptionsCard({
  subscriptions,
  isLoading,
  onUnsubscribe,
  onSubscribe,
  onRemove,
}: SubscriptionsCardProps) {
  return (
    <div className="bg-panel rounded-2xl overflow-hidden">
      <h2 className="text-white text-2xl font-bold p-6 pb-4">Subscriptions</h2>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="divide-y divide-[#272727]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-[#272727] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[#272727] rounded w-32" />
                <div className="h-3 bg-[#272727] rounded w-20" />
              </div>
              <div className="h-8 bg-[#272727] rounded w-24" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && subscriptions.length === 0 && (
        <div className="text-center py-10 px-6">
          <div className="w-12 h-12 rounded-full bg-[#1C1C1C] flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ADADAD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <p className="text-[#ADADAD] text-sm mb-2">
            You haven&apos;t subscribed to any creators yet.
          </p>
          <Link
            href="/"
            className="text-purple text-sm font-semibold hover:opacity-80 transition-opacity"
          >
            Browse creators
          </Link>
        </div>
      )}

      {/* Subscription Rows */}
      {!isLoading && subscriptions.length > 0 && (
        <>
          {/* Desktop Table Header */}
          <div className="hidden md:grid bg-input-dark px-6 py-3 grid-cols-[1fr_1fr_1fr_1fr_1fr] items-center">
            <span className="text-white text-base font-semibold">Creator</span>
            <span className="text-white text-base font-semibold">Price</span>
            <span className="text-white text-base font-semibold">Status</span>
            <span className="text-white text-base font-semibold">Next Billing</span>
            <span className="text-white text-base font-semibold">Manage</span>
          </div>

          <div className="divide-y divide-[#272727]">
            {subscriptions.map((subscription) => (
              <div key={subscription.id}>
                {/* Desktop Row */}
                <div className="hidden md:grid px-6 py-4 grid-cols-[1fr_1fr_1fr_1fr_1fr] items-center">
                  {/* Creator */}
                  <Link
                    href={`/creator/${subscription.creatorUsername}`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <CreatorAvatar name={subscription.creatorName} src={subscription.creatorAvatar} />
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSubscribe?.(subscription.id)}
                        className="px-4 py-2 bg-[#262550] border border-purple text-purple text-sm font-bold rounded-lg hover:bg-purple/20 transition-colors"
                      >
                        Subscribe
                      </button>
                      <button
                        onClick={() => onRemove?.(subscription.id)}
                        className="px-4 py-2 border border-[#ADADAD]/30 text-[#ADADAD] text-sm font-bold rounded-lg hover:bg-white/5 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Mobile Card */}
                <div className="md:hidden px-4 py-4 space-y-3">
                  {/* Creator row */}
                  <Link
                    href={`/creator/${subscription.creatorUsername}`}
                    className="flex items-center gap-3"
                  >
                    <CreatorAvatar name={subscription.creatorName} src={subscription.creatorAvatar} />
                    <span className="text-white text-base font-medium">
                      {subscription.creatorName}
                    </span>
                  </Link>

                  {/* Price + Status row */}
                  <div className="flex items-center gap-3">
                    <span className="text-white text-sm font-medium">
                      ${subscription.price.toFixed(2)} / month
                    </span>
                    {subscription.status === "active" ? (
                      <span className="inline-block px-3 py-1 bg-[#256B5F] rounded-full text-white text-xs font-bold uppercase">
                        Active
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-[#ADADAD] rounded-full text-black text-xs font-semibold uppercase">
                        Canceled
                      </span>
                    )}
                  </div>

                  {/* Billing + Action row */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#ADADAD] text-xs">
                      {subscription.nextBilling ? `Next billing: ${subscription.nextBilling}` : "No upcoming billing"}
                    </span>
                    {subscription.status === "active" ? (
                      <button
                        onClick={() => onUnsubscribe?.(subscription.id)}
                        className="px-3 py-1.5 bg-[#262550] border border-purple text-purple text-xs font-bold rounded-lg hover:bg-purple/20 transition-colors"
                      >
                        Unsubscribe
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSubscribe?.(subscription.id)}
                          className="px-3 py-1.5 bg-[#262550] border border-purple text-purple text-xs font-bold rounded-lg hover:bg-purple/20 transition-colors"
                        >
                          Subscribe
                        </button>
                        <button
                          onClick={() => onRemove?.(subscription.id)}
                          className="px-3 py-1.5 border border-[#ADADAD]/30 text-[#ADADAD] text-xs font-bold rounded-lg hover:bg-white/5 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
