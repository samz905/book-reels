"use client";

import Image from "next/image";
import { CartEbook } from "../../data/mockCartData";

interface EbooksTabProps {
  ebooks: CartEbook[];
  onRemove: (id: string) => void;
}

export default function EbooksTab({ ebooks, onRemove }: EbooksTabProps) {
  return (
    <div className="bg-[#0F0E13] rounded-xl p-6">
      {/* Header */}
      <h2 className="text-white text-2xl font-bold mb-3">Ebooks</h2>
      <p className="text-white text-xl tracking-[-0.025em] mb-8">
        Ebook purchases don&apos;t unlock episodes. Subscriptions unlock
        episodes 5+.
      </p>

      {/* Ebooks row */}
      <div className="flex gap-[18px] overflow-x-auto scrollbar-hide pb-2">
        {ebooks.map((ebook) => (
          <div key={ebook.id} className="flex items-center gap-[18px] flex-shrink-0">
            {/* Remove button */}
            <button
              onClick={() => onRemove(ebook.id)}
              className="w-9 h-9 rounded-full bg-[#3E3D40] flex items-center justify-center hover:bg-[#4E4D50] transition-colors flex-shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8EAED">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
            </button>

            {/* Card content */}
            <div className="flex gap-3">
              {/* Cover */}
              <div className="w-[80px] h-[128px] rounded overflow-hidden flex-shrink-0">
                <Image
                  src={ebook.coverUrl}
                  alt={ebook.title}
                  width={80}
                  height={128}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Title and price */}
              <div className="flex flex-col gap-3 w-[155px]">
                <h3 className="text-white text-sm font-semibold leading-[18px] line-clamp-3">
                  {ebook.title}
                </h3>
                <span className="text-[#FF8C00] text-sm font-semibold leading-[18px]">
                  $ {ebook.price.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
