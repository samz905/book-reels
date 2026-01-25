"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-page flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-page relative overflow-clip">
      <div className="absolute w-[227px] h-[420px] left-[25px] top-[-260px] bg-purple-glow blur-[95px]" />

      <Header />

      <main className="relative z-10 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px] bg-card-bg-1 rounded-2xl p-8">
          <h1 className="text-white text-2xl font-semibold text-center mb-8">
            Account
          </h1>

          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-full bg-purple flex items-center justify-center mb-4">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-white"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>
            <p className="text-white font-medium">
              {user.user_metadata?.full_name || user.email}
            </p>
            <p className="text-white/50 text-sm">{user.email}</p>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-lg font-semibold text-white border border-red-500 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
