import Link from "next/link";

export default function Header() {
  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-6 bg-[#010101]">
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

      {/* Login button */}
      <Link
        href="/login"
        className="px-8 py-2.5 rounded-card text-white text-base font-semibold leading-[120%] hover:bg-card-bg-3 transition-colors"
      >
        Login
      </Link>
    </header>
  );
}
