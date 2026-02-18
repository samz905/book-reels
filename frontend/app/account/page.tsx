"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PersonalInfoCard from "../components/account/PersonalInfoCard";
import SubscriptionsCard from "../components/account/SubscriptionsCard";
import EbooksLibraryCard from "../components/account/EbooksLibraryCard";
import PaymentPayoutCard from "../components/account/PaymentPayoutCard";
import DeleteAccountModal from "../components/account/DeleteAccountModal";
import {
  mockSubscriptions,
  mockPaymentMethod,
  mockPayoutMethod,
  PurchasedEbook,
} from "../data/mockAccountData";
import { getPurchasedEbooks } from "@/lib/api/creator";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [purchasedEbooks, setPurchasedEbooks] = useState<PurchasedEbook[]>([]);
  const [ebooksLoading, setEbooksLoading] = useState(true);

  // Fetch purchased ebooks when user is authenticated
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

  useEffect(() => {
    if (user) {
      fetchEbooks();
    }
  }, [user, fetchEbooks]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  const handleDeleteAccount = async () => {
    // TODO: Implement account deletion
    console.log("Delete account");
    setShowDeleteModal(false);
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
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
          onNameUpdate={(newName) => {
            // TODO: Update name in Supabase
            console.log("Update name:", newName);
          }}
          onPasswordUpdate={(newPassword) => {
            // TODO: Update password in Supabase
            console.log("Update password");
          }}
        />

        {/* Subscriptions */}
        <SubscriptionsCard
          subscriptions={mockSubscriptions}
          onUnsubscribe={(id) => {
            // TODO: Handle unsubscribe
            console.log("Unsubscribe:", id);
          }}
          onSubscribe={(id) => {
            // TODO: Handle subscribe
            console.log("Subscribe:", id);
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

        {/* Payment & Payout Methods */}
        <PaymentPayoutCard
          paymentMethod={mockPaymentMethod}
          payoutMethod={mockPayoutMethod}
          onPaymentUpdate={(data) => {
            // TODO: Update payment method
            console.log("Update payment:", data);
          }}
          onPayoutUpdate={(data) => {
            // TODO: Update payout method
            console.log("Update payout:", data);
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
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
