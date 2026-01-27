"use client";

import Image from "next/image";
import { CartEbook } from "../../data/mockCartData";

interface EbooksTabProps {
  ebooks: CartEbook[];
  onRemove: (id: string) => void;
}

export default function EbooksTab({ ebooks, onRemove }: EbooksTabProps) {
  return (
    <div className="bg-[#0F0E13] rounded-2xl p-6">
      {/* Header */}
      <h2 className="text-white text-2xl font-bold mb-2">Ebooks</h2>
      <p className="text-[#ADADAD] text-base mb-6">
        Ebook purchases don&apos;t unlock episodes. Subscriptions unlock
        episodes 5+.
      </p>

      {/* Ebooks grid */}
      <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-2">
        {ebooks.map((ebook) => (
          <div key={ebook.id} className="flex-shrink-0 w-[140px]">
            {/* Cover with remove button */}
            <div className="relative mb-2">
              <Image
                src={ebook.coverUrl}
                alt={ebook.title}
                width={140}
                height={200}
                className="rounded-lg object-cover w-[140px] h-[200px]"
              />
              {/* Remove button - top left */}
              <button
                onClick={() => onRemove(ebook.id)}
                className="absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center"
                style={{
                  background: "rgba(147, 130, 255, 0.8)",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
              </button>
            </div>

            {/* Title */}
            <h3 className="text-white text-sm font-medium line-clamp-2 mb-1">
              {ebook.title}
            </h3>

            {/* Price */}
            <span className="text-[#FF8C00] text-sm font-semibold">
              $ {ebook.price.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
