"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import posthog from "posthog-js";

// ---- Types (used by cart components) ----

export interface CartSubscription {
  id: string;
  creatorName: string;
  creatorAvatar: string;
  price: number;
  renewsDate: string;
}

export interface CartEbook {
  id: string;
  title: string;
  coverUrl: string;
  price: number;
}

// Raw shape returned by GET /api/cart
interface CartItemRaw {
  id: string;
  item_type: "subscription" | "ebook";
  price: number;
  creator_id: string | null;
  ebook_id: string | null;
  creator: { id: string; username: string; name: string; avatar_url: string | null } | null;
  ebook: { id: string; title: string; cover_url: string | null; price: number } | null;
}

interface CartContextType {
  subscriptions: CartSubscription[];
  ebooks: CartEbook[];
  loading: boolean;
  checkoutLoading: boolean;
  removeSubscription: (id: string) => void;
  removeEbook: (id: string) => void;
  addSubscription: (creatorId: string, price: number) => Promise<void>;
  addEbook: (ebookId: string, price: number) => Promise<void>;
  checkout: () => Promise<boolean>;
  clearCart: () => void;
  getSubscriptionsTotal: () => number;
  getEbooksTotal: () => number;
}

const CartContext = createContext<CartContextType>({
  subscriptions: [],
  ebooks: [],
  loading: true,
  checkoutLoading: false,
  removeSubscription: () => {},
  removeEbook: () => {},
  addSubscription: async () => {},
  addEbook: async () => {},
  checkout: async () => false,
  clearCart: () => {},
  getSubscriptionsTotal: () => 0,
  getEbooksTotal: () => 0,
});

// ---- Mappers ----

function mapSubscription(item: CartItemRaw): CartSubscription {
  return {
    id: item.id,
    creatorName: item.creator?.name || item.creator?.username || "Unknown",
    creatorAvatar: item.creator?.avatar_url || "",
    price: Number(item.price),
    renewsDate: "",
  };
}

function mapEbook(item: CartItemRaw): CartEbook {
  return {
    id: item.id,
    title: item.ebook?.title || "Untitled",
    coverUrl: item.ebook?.cover_url || "",
    price: Number(item.price),
  };
}

// ---- Provider ----

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [subscriptions, setSubscriptions] = useState<CartSubscription[]>([]);
  const [ebooks, setEbooks] = useState<CartEbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      if (!res.ok) {
        setSubscriptions([]);
        setEbooks([]);
        return;
      }
      const data = await res.json();
      const subs = (data.subscriptions || []) as CartItemRaw[];
      const ebs = (data.ebooks || []) as CartItemRaw[];
      setSubscriptions(subs.map(mapSubscription));
      setEbooks(ebs.map(mapEbook));
    } catch {
      setSubscriptions([]);
      setEbooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const removeSubscription = useCallback(async (id: string) => {
    const removed = subscriptions.find((s) => s.id === id);
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    if (removed) {
      posthog.capture("cart_item_removed", {
        item_type: "subscription",
        item_id: id,
        price: removed.price,
        creator_name: removed.creatorName,
      });
    }
    try {
      await fetch(`/api/cart/${id}`, { method: "DELETE" });
    } catch {
      fetchCart();
    }
  }, [fetchCart, subscriptions]);

  const removeEbook = useCallback(async (id: string) => {
    const removed = ebooks.find((e) => e.id === id);
    setEbooks((prev) => prev.filter((e) => e.id !== id));
    if (removed) {
      posthog.capture("cart_item_removed", {
        item_type: "ebook",
        item_id: id,
        price: removed.price,
        title: removed.title,
      });
    }
    try {
      await fetch(`/api/cart/${id}`, { method: "DELETE" });
    } catch {
      fetchCart();
    }
  }, [fetchCart, ebooks]);

  const addSubscription = useCallback(async (creatorId: string, price: number) => {
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_type: "subscription", creator_id: creatorId, price }),
      });
      if (res.ok) {
        posthog.capture("cart_item_added", {
          item_type: "subscription",
          creator_id: creatorId,
          price,
        });
        await fetchCart();
      }
    } catch {
      // Caller can handle
    }
  }, [fetchCart]);

  const addEbook = useCallback(async (ebookId: string, price: number) => {
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_type: "ebook", ebook_id: ebookId, price }),
      });
      if (res.ok) {
        posthog.capture("cart_item_added", {
          item_type: "ebook",
          ebook_id: ebookId,
          price,
        });
        await fetchCart();
      }
    } catch {
      // Caller can handle
    }
  }, [fetchCart]);

  const checkout = useCallback(async (): Promise<boolean> => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/cart/checkout", { method: "POST" });
      if (!res.ok) return false;
      setSubscriptions([]);
      setEbooks([]);
      return true;
    } catch {
      return false;
    } finally {
      setCheckoutLoading(false);
    }
  }, []);

  const clearCart = useCallback(() => {
    setSubscriptions([]);
    setEbooks([]);
  }, []);

  const getSubscriptionsTotal = useCallback(
    () => subscriptions.reduce((sum, s) => sum + s.price, 0),
    [subscriptions]
  );

  const getEbooksTotal = useCallback(
    () => ebooks.reduce((sum, e) => sum + e.price, 0),
    [ebooks]
  );

  return (
    <CartContext.Provider
      value={{
        subscriptions,
        ebooks,
        loading,
        checkoutLoading,
        removeSubscription,
        removeEbook,
        addSubscription,
        addEbook,
        checkout,
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
