"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  isDeleting?: boolean;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isDeleting = false,
}: DeleteConfirmModalProps) {
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

  const handleConfirm = async () => {
    if (isDeleting) return;
    await onConfirm();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-panel border border-panel-border rounded-2xl p-6 w-full max-w-[400px] mx-4">
        <h2 className="text-white text-xl font-bold mb-3">{title}</h2>
        <p className="text-[#ADADAD] text-sm mb-6">{message}</p>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2.5 text-[#ADADAD] text-sm font-semibold hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
