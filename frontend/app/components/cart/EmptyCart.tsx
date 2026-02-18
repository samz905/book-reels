"use client";

import Link from "next/link";

export default function EmptyCart() {
  return (
    <div className="bg-panel rounded-2xl min-h-[500px] flex flex-col items-center justify-center gap-4">
      {/* Bag outline icon */}
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>

      <h2 className="text-white text-2xl font-bold">Nothing here yet</h2>
      <p className="text-[#ADADAD] text-base">
        Explore stories and subscribe to creators you love.
      </p>

      <Link
        href="/"
        className="mt-4 px-8 py-3 rounded-lg text-white font-semibold text-base"
        style={{
          background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)",
        }}
      >
        Browse Stories
      </Link>
    </div>
  );
}
