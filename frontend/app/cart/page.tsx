"use client";

import { useState } from "react";
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
  const { user, loading: authLoading } = useAuth();
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

  // Auth loading
  if (authLoading) {
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

  // Not signed in
  if (!user) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <main className="px-4 md:px-6 py-8 max-w-7xl mx-auto">
          <div className="bg-panel rounded-xl p-8 text-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              className="mx-auto mb-4 opacity-40"
            >
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            <h2 className="text-white text-xl font-semibold mb-4">
              Sign in to view your cart
            </h2>
            <p className="text-white/60 mb-6">
              Subscribe to creators you love and purchase ebooks.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="px-6 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)",
              }}
            >
              Sign In
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
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
