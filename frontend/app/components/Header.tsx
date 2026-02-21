"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, accessStatus, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isApproved = accessStatus === "approved";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    setShowDropdown(false);
    setMobileMenuOpen(false);
    await signOut();
    router.push("/");
  };

  // Get user display name from metadata
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "User";

  return (
    <header className="sticky top-0 z-30 bg-[#010101]">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        {/* Logo */}
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <img
            src="/logo-white.png"
            alt="Oddega"
            width={36}
            height={36}
            className="h-9 w-9"
          />
        </Link>

        {/* Center nav — desktop only, only for approved users */}
        {isApproved && (
          <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-white text-base font-semibold leading-[120%] hover:opacity-80 transition-opacity"
            >
              Browse
            </Link>
            <Link
              href="/create"
              className="text-white text-base font-semibold leading-[120%] hover:opacity-80 transition-opacity"
            >
              Create
            </Link>
          </nav>
        )}

        {/* Desktop auth section */}
        <div className="hidden md:block">
          {loading ? (
            <div className="w-[100px]" />
          ) : user ? (
            <div className="flex items-center gap-4">
              {/* Cart Icon — only for approved users */}
              {isApproved && (
                <Link
                  href="/cart"
                  className="hover:opacity-80 transition-opacity"
                >
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
                </Link>
              )}

              {/* Profile dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <div className="w-[38px] h-[38px] rounded-full bg-purple flex items-center justify-center overflow-hidden">
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
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className={`text-white transition-transform ${showDropdown ? "rotate-180" : ""}`}
                  >
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {showDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-panel-border rounded-xl border border-menu-bg shadow-lg overflow-hidden z-50">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-menu-bg">
                      <p className="text-white font-medium truncate">{displayName}</p>
                      <p className="text-white/50 text-sm truncate">{user.email}</p>
                      {!isApproved && (
                        <span className="inline-block mt-1.5 text-xs text-[#9C99FF] bg-[#9C99FF]/10 px-2 py-0.5 rounded-full">
                          Access Pending
                        </span>
                      )}
                    </div>

                    {/* Menu items — only for approved users */}
                    {isApproved && (
                      <div className="py-1">
                        <Link
                          href="/account"
                          onClick={() => setShowDropdown(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-white hover:bg-menu-bg transition-colors"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                          Account
                        </Link>
                        <Link
                          href="/create"
                          onClick={() => setShowDropdown(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-white hover:bg-menu-bg transition-colors"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                          </svg>
                          Creator Dashboard
                        </Link>
                        <Link
                          href="/drafts"
                          onClick={() => setShowDropdown(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-white hover:bg-menu-bg transition-colors"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          My Drafts
                        </Link>
                      </div>
                    )}

                    {/* Sign out */}
                    <div className="border-t border-menu-bg py-1">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-red-400 hover:bg-menu-bg transition-colors"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                        </svg>
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-8 py-2.5 rounded-card text-white text-base font-semibold leading-[120%] hover:bg-card-bg-3 transition-colors"
            >
              Request Access
            </Link>
          )}
        </div>

        {/* Mobile hamburger button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden flex items-center justify-center w-10 h-10 text-white"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#010101] px-4 pb-3">
          {/* Profile row — compact, at top */}
          {!loading && user && (
            <div className="flex items-center gap-3 py-3 border-b border-white/10">
              <div className="w-8 h-8 rounded-full bg-purple flex items-center justify-center overflow-hidden flex-shrink-0">
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white font-medium text-sm truncate">{displayName}</p>
                <p className="text-white/50 text-xs truncate">{user.email}</p>
              </div>
              {!isApproved && (
                <span className="ml-auto text-xs text-[#9C99FF] bg-[#9C99FF]/10 px-2 py-0.5 rounded-full flex-shrink-0">
                  Pending
                </span>
              )}
            </div>
          )}

          {/* Nav links */}
          <nav className="flex flex-col py-1">
            {/* Full nav for approved users */}
            {isApproved && (
              <>
                <Link href="/" className="px-3 py-2.5 text-white font-semibold rounded-lg hover:bg-white/5 transition-colors flex items-center gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                  </svg>
                  Browse
                </Link>
                <Link href="/create" className="px-3 py-2.5 text-white font-semibold rounded-lg hover:bg-white/5 transition-colors flex items-center gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                  Create
                </Link>
                {!loading && user && (
                  <>
                    <Link href="/cart" className="px-3 py-2.5 text-white font-semibold rounded-lg hover:bg-white/5 transition-colors flex items-center gap-3">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7.5 7.67V6.7c0-2.25 1.81-4.46 4.06-4.67C14.24 1.77 16.5 3.88 16.5 6.51V7.89" />
                        <path d="M9 22h6c4.02 0 4.74-1.61 4.95-3.57l.75-6C20.97 9.99 20.27 8 16 8H8c-4.27 0-4.97 1.99-4.7 4.43l.75 6C4.26 20.39 4.98 22 9 22z" />
                      </svg>
                      Cart
                    </Link>
                    <Link href="/account" className="px-3 py-2.5 text-white font-semibold rounded-lg hover:bg-white/5 transition-colors flex items-center gap-3">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                      Account
                    </Link>
                    <Link href="/drafts" className="px-3 py-2.5 text-white font-semibold rounded-lg hover:bg-white/5 transition-colors flex items-center gap-3">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      My Drafts
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Bottom section */}
          {!loading && (
            <>
              {user ? (
                <>
                  <div className="border-t border-white/10 mt-1" />
                  <button
                    onClick={handleSignOut}
                    className="w-full px-3 py-2.5 text-red-400 font-semibold rounded-lg hover:bg-white/5 transition-colors text-left flex items-center gap-3"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                    </svg>
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <div className="border-t border-white/10 mt-1" />
                  <Link
                    href="/login"
                    className="block px-3 py-2.5 text-white font-semibold rounded-lg text-center bg-button-gradient mt-2"
                  >
                    Request Access
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      )}
    </header>
  );
}
