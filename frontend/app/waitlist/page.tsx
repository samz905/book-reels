"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function WaitlistPage() {
  const router = useRouter();
  const { user, loading, accessStatus, signOut } = useAuth();

  // Redirect approved users to home, unauthenticated to login
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (accessStatus === "approved") {
      router.push("/");
      return;
    }
  }, [user, loading, accessStatus, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "there";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-page flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#9C99FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || accessStatus === "approved") return null;

  return (
    <div className="min-h-screen bg-gradient-page relative overflow-clip">
      {/* Purple glow effects */}
      <div className="absolute w-[227px] h-[420px] left-[25px] top-[-260px] bg-purple-glow blur-[95px]" />
      <div className="absolute w-[300px] h-[300px] left-1/2 -translate-x-1/2 top-[200px] bg-[rgba(156,153,255,0.15)] blur-[120px] rounded-full" />

      <Header />

      <main className="relative z-10 flex items-center justify-center px-4 md:px-6 py-16 md:py-24">
        <div className="w-full max-w-[480px] text-center">
          {/* Checkmark icon in gradient circle */}
          <div className="mx-auto mb-8 w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(156,153,255,0.2) 0%, rgba(115,112,255,0.2) 100%)", border: "1px solid rgba(156,153,255,0.3)" }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-[#9C99FF]">
              <path
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            You&apos;re on the list, {displayName}! 🎉
          </h1>

          {/* Subtext */}
          <p className="text-white/60 text-lg mb-3 leading-relaxed">
            We&apos;re so excited you asked for early access.
          </p>

          <p className="text-white/60 text-base mb-3 leading-relaxed">
            We&apos;re inviting creators in thoughtfully, one group at a time, to make sure everyone gets the best possible experience.
          </p>

          <p className="text-white/60 text-base mb-3 leading-relaxed">
            As soon as your account is ready, we&apos;ll send a note to <span className="text-white font-medium">{user.email}</span>.
          </p>

          <p className="text-white/60 text-base mb-10 leading-relaxed">
            Can&apos;t wait to welcome you in.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleSignOut}
              className="px-8 py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/5 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </main>

      {/* <Footer /> */}
    </div>
  );
}
