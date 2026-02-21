"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PersonalInfoCard from "../components/account/PersonalInfoCard";
import SubscriptionsCard from "../components/account/SubscriptionsCard";
import EbooksLibraryCard from "../components/account/EbooksLibraryCard";
import DeleteAccountModal from "../components/account/DeleteAccountModal";
import type { Subscription, PurchasedEbook } from "../data/mockAccountData";
import {
  getPurchasedEbooks,
  getSubscriptions,
  cancelSubscription,
  updateProfile,
} from "@/lib/api/creator";
import { createClient } from "@/lib/supabase/client";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, accessStatus, signOut } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Ebooks state
  const [purchasedEbooks, setPurchasedEbooks] = useState<PurchasedEbook[]>([]);
  const [ebooksLoading, setEbooksLoading] = useState(true);

  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);

  // Fetch purchased ebooks
  const fetchEbooks = useCallback(async () => {
    if (!user) return;
    setEbooksLoading(true);
    try {
      const ebooks = await getPurchasedEbooks();
      setPurchasedEbooks(ebooks);
    } catch (err) {
      console.error("Error fetching purchased ebooks:", err);
    } finally {
      setEbooksLoading(false);
    }
  }, [user]);

  // Fetch subscriptions
  const fetchSubscriptions = useCallback(async () => {
    if (!user) return;
    setSubsLoading(true);
    try {
      const subs = await getSubscriptions();
      setSubscriptions(subs);
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
    } finally {
      setSubsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchEbooks();
      fetchSubscriptions();
    }
  }, [user, fetchEbooks, fetchSubscriptions]);

  // Redirect to login if not authenticated, or waitlist if not approved
  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    if (accessStatus !== "approved") { router.push("/waitlist"); return; }
  }, [user, loading, accessStatus, router]);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#9C99FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  // Get user info from auth
  const userName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";
  const userEmail = user.email || "";

  return (
    <div className="min-h-screen bg-black relative overflow-clip">
      <Header />

      <main className="relative z-10 px-4 md:px-6 py-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Personal Information */}
        <PersonalInfoCard
          name={userName}
          email={userEmail}
          onNameUpdate={async (newName) => {
            await updateProfile(user.id, { name: newName });
            // Also sync auth metadata so Header picks up the new name
            const supabase = createClient();
            await supabase.auth.updateUser({ data: { full_name: newName } });
          }}
          onPasswordUpdate={async (newPassword) => {
            const supabase = createClient();
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
          }}
        />

        {/* Subscriptions */}
        <SubscriptionsCard
          subscriptions={subscriptions}
          isLoading={subsLoading}
          onUnsubscribe={async (id) => {
            try {
              await cancelSubscription(id);
              setSubscriptions((prev) =>
                prev.map((s) =>
                  s.id === id ? { ...s, status: "canceled" as const, nextBilling: null } : s
                )
              );
            } catch (err) {
              console.error("Failed to cancel subscription:", err);
            }
          }}
          onSubscribe={(id) => {
            const sub = subscriptions.find((s) => s.id === id);
            if (sub) {
              router.push(`/creator/${sub.creatorUsername}`);
            }
          }}
          onRemove={async (id) => {
            try {
              await cancelSubscription(id);
              setSubscriptions((prev) => prev.filter((s) => s.id !== id));
            } catch (err) {
              console.error("Failed to remove subscription:", err);
            }
          }}
        />

        {/* Ebooks Library */}
        <EbooksLibraryCard
          ebooks={purchasedEbooks}
          isLoading={ebooksLoading}
          onReadNow={(id) => {
            router.push(`/read/${id}`);
          }}
        />

        {/* Delete Account & Log Out */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-[#AE1414] text-lg sm:text-xl font-bold hover:opacity-80 transition-opacity"
            >
              Delete Account
            </button>
            <span className="text-[#ADADAD] text-sm font-semibold">
              This will permanently delete your account, purchases, and
              activity. This action can&apos;t be undone.
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-green-3 text-base font-bold hover:opacity-80 transition-opacity flex-shrink-0"
          >
            Log Out
          </button>
        </div>
      </main>

      <Footer />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
