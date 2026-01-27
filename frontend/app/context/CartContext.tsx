"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { CartSubscription, CartEbook } from "../data/mockCartData";

interface CartContextType {
  subscriptions: CartSubscription[];
  ebooks: CartEbook[];
  addSubscription: (subscription: CartSubscription) => void;
  addEbook: (ebook: CartEbook) => void;
  removeSubscription: (id: string) => void;
  removeEbook: (id: string) => void;
  clearCart: () => void;
  getSubscriptionsTotal: () => number;
  getEbooksTotal: () => number;
}

const CartContext = createContext<CartContextType>({
  subscriptions: [],
  ebooks: [],
  addSubscription: () => {},
  addEbook: () => {},
  removeSubscription: () => {},
  removeEbook: () => {},
  clearCart: () => {},
  getSubscriptionsTotal: () => 0,
  getEbooksTotal: () => 0,
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [subscriptions, setSubscriptions] = useState<CartSubscription[]>([]);
  const [ebooks, setEbooks] = useState<CartEbook[]>([]);

  const addSubscription = useCallback((subscription: CartSubscription) => {
    setSubscriptions((prev) => {
      // Prevent duplicates
      if (prev.find((s) => s.id === subscription.id)) return prev;
      return [...prev, subscription];
    });
  }, []);

  const addEbook = useCallback((ebook: CartEbook) => {
    setEbooks((prev) => {
      // Prevent duplicates
      if (prev.find((e) => e.id === ebook.id)) return prev;
      return [...prev, ebook];
    });
  }, []);

  const removeSubscription = useCallback((id: string) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const removeEbook = useCallback((id: string) => {
    setEbooks((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setSubscriptions([]);
    setEbooks([]);
  }, []);

  const getSubscriptionsTotal = useCallback(() => {
    return subscriptions.reduce((sum, s) => sum + s.price, 0);
  }, [subscriptions]);

  const getEbooksTotal = useCallback(() => {
    return ebooks.reduce((sum, e) => sum + e.price, 0);
  }, [ebooks]);

  return (
    <CartContext.Provider
      value={{
        subscriptions,
        ebooks,
        addSubscription,
        addEbook,
        removeSubscription,
        removeEbook,
        clearCart,
        getSubscriptionsTotal,
        getEbooksTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
