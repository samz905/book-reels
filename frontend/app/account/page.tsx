"use client";

import { useEffect, useState } from "react";
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
  mockPurchasedEbooks,
  mockPaymentMethod,
  mockPayoutMethod,
} from "../data/mockAccountData";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

      <main className="relative z-10 px-6 py-8 max-w-7xl mx-auto space-y-8">
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
          ebooks={mockPurchasedEbooks}
          onReadNow={(id) => {
            // TODO: Open ebook reader
            console.log("Read ebook:", id);
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-[#AE1414] text-xl font-bold hover:opacity-80 transition-opacity"
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
            className="text-green-3 text-base font-bold hover:opacity-80 transition-opacity"
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
