"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
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
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1C1C1C] rounded-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-white text-xl font-bold mb-3">Delete Account</h2>
        <p className="text-[#ADADAD] text-base leading-relaxed mb-6">
          We&apos;ll permanently remove your account and all associated data.
          Take a moment to be sure this is what you want.
        </p>

        <div className="flex items-center justify-end gap-4">
          <button
            onClick={onClose}
            className="text-[#ADADAD] text-base font-medium hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2.5 bg-[#DC2626] text-white text-base font-semibold rounded-lg hover:bg-[#B91C1C] transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
