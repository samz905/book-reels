"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-6 bg-[#010101]">
      {/* Home icon with circle background */}
      <Link
        href="/"
        className="w-[38px] h-[38px] rounded-full bg-card-bg-3 flex items-center justify-center hover:bg-card-bg-4 transition-colors"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-white"
        >
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      </Link>

      {/* Center nav */}
      <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-8">
        <Link
          href="/creators"
          className="text-white text-base font-semibold leading-[120%] hover:opacity-80 transition-opacity"
        >
          For Creators
        </Link>
        <Link
          href="/create"
          className="text-white text-base font-semibold leading-[120%] hover:opacity-80 transition-opacity"
        >
          Create
        </Link>
      </nav>

      {/* Auth section */}
      {loading ? (
        <div className="w-[100px]" />
      ) : user ? (
        <Link
          href="/account"
          className="flex items-center gap-6 hover:opacity-80 transition-opacity"
        >
          <span className="text-white text-base font-semibold leading-[120%]">
            Account
          </span>
          {/* Cart Icon */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-white"
          >
            <path
              d="M7.5 7.67001V6.70001C7.5 4.45001 9.31 2.24001 11.56 2.03001C14.24 1.77001 16.5 3.88001 16.5 6.51001V7.89001"
              stroke="currentColor"
              strokeWidth="2"
              strokeMiterlimit="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.99983 22H14.9998C19.0198 22 19.7398 20.39 19.9498 18.43L20.6998 12.43C20.9698 9.99 20.2698 8 15.9998 8H7.99983C3.72983 8 3.02983 9.99 3.29983 12.43L4.04983 18.43C4.25983 20.39 4.97983 22 8.99983 22Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeMiterlimit="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M15.4955 12H15.5045"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.49451 12H8.50349"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="w-[38px] h-[38px] rounded-full bg-purple flex items-center justify-center">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-white"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            )}
          </div>
        </Link>
      ) : (
        <Link
          href="/login"
          className="px-8 py-2.5 rounded-card text-white text-base font-semibold leading-[120%] hover:bg-card-bg-3 transition-colors"
        >
          Login
        </Link>
      )}
    </header>
  );
}
