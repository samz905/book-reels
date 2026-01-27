"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface PurchaseSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PurchaseSuccessModal({
  isOpen,
  onClose,
}: PurchaseSuccessModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#1C1C1C] rounded-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-white text-xl font-bold mb-3">
          You&apos;re All Set! 🎉
        </h2>
        <p className="text-white text-base mb-4">
          Your purchase was successful.
        </p>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="text-[#1ED760] text-base font-medium hover:opacity-80 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
