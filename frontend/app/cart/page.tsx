"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import EmptyCart from "../components/cart/EmptyCart";
import SubscriptionsTab from "../components/cart/SubscriptionsTab";
import EbooksTab from "../components/cart/EbooksTab";
import OrderSummary from "../components/cart/OrderSummary";
import PaymentMethodCard from "../components/cart/PaymentMethodCard";
import PurchaseSuccessModal from "../components/cart/PurchaseSuccessModal";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

type TabType = "subscriptions" | "ebooks";

export default function CartPage() {
  const router = useRouter();
  const { user, loading: authLoading, accessStatus } = useAuth();

  // Redirect if not authenticated or explicitly pending/rejected
  useEffect(() => {
    if (authLoading || accessStatus === null) return;
    if (!user) { router.push("/login"); return; }
    if (accessStatus !== "approved") { router.push("/waitlist"); return; }
  }, [user, authLoading, accessStatus, router]);
  const [activeTab, setActiveTab] = useState<TabType>("subscriptions");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const {
    subscriptions,
    ebooks,
    loading,
    checkoutLoading,
    removeSubscription,
    removeEbook,
    checkout,
    clearCart,
    getSubscriptionsTotal,
    getEbooksTotal,
  } = useCart();

  const handleCompletePurchase = async () => {
    const success = await checkout();
    if (success) {
      setShowSuccessModal(true);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    clearCart();
  };

  const isSubscriptionsEmpty = subscriptions.length === 0;
  const isEbooksEmpty = ebooks.length === 0;
  const isCurrentTabEmpty =
    activeTab === "subscriptions" ? isSubscriptionsEmpty : isEbooksEmpty;

  const currentTotal =
    activeTab === "subscriptions" ? getSubscriptionsTotal() : getEbooksTotal();
  const currentCount =
    activeTab === "subscriptions" ? subscriptions.length : ebooks.length;

  // Auth loading or access status pending resolution
  if (authLoading || (user && accessStatus === null)) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <main className="px-4 md:px-6 py-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#B8B6FC] border-t-transparent rounded-full animate-spin" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Not signed in or not approved — redirect handles this
  if (!user || accessStatus !== "approved") {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="px-4 md:px-6 py-8 max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="flex items-center gap-5 mb-6">
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`px-4 py-2 text-base uppercase tracking-[0.25px] transition-colors ${
              activeTab === "subscriptions"
                ? "text-white font-bold border-b-2 border-white rounded-b-lg"
                : "text-[#ADADAD] font-medium hover:text-white"
            }`}
          >
            Subscriptions
          </button>
          <button
            onClick={() => setActiveTab("ebooks")}
            className={`px-3 py-2 text-base uppercase tracking-[0.25px] transition-colors ${
              activeTab === "ebooks"
                ? "text-white font-bold border-b-2 border-white rounded-b-lg"
                : "text-[#ADADAD] font-medium hover:text-white"
            }`}
          >
            Ebooks
          </button>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#B8B6FC] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isCurrentTabEmpty ? (
          <EmptyCart />
        ) : (
          <>
            {activeTab === "subscriptions" ? (
              <SubscriptionsTab
                subscriptions={subscriptions}
                onRemove={removeSubscription}
              />
            ) : (
              <EbooksTab ebooks={ebooks} onRemove={removeEbook} />
            )}

            {/* Bottom section - Order Summary + Payment Method */}
            <div className="flex flex-col lg:flex-row gap-6 mt-6">
              <OrderSummary
                itemCount={currentCount}
                itemType={activeTab}
                subtotal={currentTotal}
                total={currentTotal}
                onCompletePurchase={handleCompletePurchase}
                isLoading={checkoutLoading}
              />
              <PaymentMethodCard />
            </div>
          </>
        )}
      </main>

      <Footer />

      {/* Success Modal */}
      <PurchaseSuccessModal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccessModal}
      />
    </div>
  );
}
