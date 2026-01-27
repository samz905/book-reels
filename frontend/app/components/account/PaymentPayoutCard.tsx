"use client";

import { useState } from "react";
import { PaymentMethod, PayoutMethod } from "../../data/mockAccountData";

interface PaymentPayoutCardProps {
  paymentMethod: PaymentMethod | null;
  payoutMethod: PayoutMethod | null;
  onPaymentUpdate?: (data: PaymentFormData) => void;
  onPayoutUpdate?: (data: PayoutFormData) => void;
}

interface PaymentFormData {
  name: string;
  cardNumber: string;
  expiration: string;
  cvv: string;
}

interface PayoutFormData {
  accountHolderName: string;
  accountType: "checking" | "savings";
  routingNumber: string;
  accountNumber: string;
  address: string;
}

// Visa Logo Component
const VisaLogo = () => (
  <svg width="43" height="15" viewBox="0 0 43 15" fill="none">
    <rect width="43" height="15" rx="2" fill="white" />
    <path
      d="M16.3 10.5H13.8L15.4 4.5H17.9L16.3 10.5Z"
      fill="#172B85"
    />
    <path
      d="M25.5 4.7C25 4.5 24.2 4.3 23.2 4.3C20.7 4.3 19 5.5 19 7.2C19 8.5 20.2 9.1 21.1 9.5C22 9.9 22.3 10.2 22.3 10.5C22.3 11 21.7 11.2 21.1 11.2C20.2 11.2 19.7 11.1 18.9 10.7L18.6 10.6L18.3 12.4C18.9 12.7 20 12.9 21.1 12.9C23.8 12.9 25.4 11.7 25.4 9.9C25.4 8.9 24.8 8.1 23.5 7.5C22.7 7.1 22.2 6.8 22.2 6.4C22.2 6.1 22.6 5.7 23.4 5.7C24.1 5.7 24.6 5.8 25 6L25.2 6.1L25.5 4.7Z"
      fill="#172B85"
    />
    <path
      d="M29.5 4.5H27.6C27 4.5 26.6 4.7 26.4 5.3L22.7 10.5H25.4L25.9 9.1H29.1L29.4 10.5H31.8L29.5 4.5ZM26.6 7.5C26.8 7 27.5 5.5 27.5 5.5C27.5 5.5 27.7 5 27.8 4.7L28 5.4C28 5.4 28.5 7.3 28.6 7.5H26.6Z"
      fill="#172B85"
    />
    <path
      d="M12.2 4.5L9.7 8.5L9.4 7C9.1 6 8.1 4.9 7 4.4L9.3 10.5H12L16.2 4.5H12.2Z"
      fill="#172B85"
    />
    <path
      d="M8.2 4.5H4.1L4 4.7C7.2 5.5 9.2 7.3 9.8 9.4L9.1 5.3C9 4.7 8.6 4.5 8.2 4.5Z"
      fill="#F9A533"
    />
  </svg>
);

// Bank Verified Icon
const BankVerifiedIcon = () => (
  <svg width="22" height="23" viewBox="0 0 22 23" fill="none">
    <path
      d="M3 14.75V9.75C3 9.46667 3.09583 9.22917 3.2875 9.0375C3.47917 8.84583 3.71667 8.75 4 8.75C4.28333 8.75 4.52083 8.84583 4.7125 9.0375C4.90417 9.22917 5 9.46667 5 9.75V14.75C5 15.0333 4.90417 15.2708 4.7125 15.4625C4.52083 15.6542 4.28333 15.75 4 15.75C3.71667 15.75 3.47917 15.6542 3.2875 15.4625C3.09583 15.2708 3 15.0333 3 14.75ZM9 14.75V9.75C9 9.46667 9.09583 9.22917 9.2875 9.0375C9.47917 8.84583 9.71667 8.75 10 8.75C10.2833 8.75 10.5208 8.84583 10.7125 9.0375C10.9042 9.22917 11 9.46667 11 9.75V14.75C11 15.0333 10.9042 15.2708 10.7125 15.4625C10.5208 15.6542 10.2833 15.75 10 15.75C9.71667 15.75 9.47917 15.6542 9.2875 15.4625C9.09583 15.2708 9 15.0333 9 14.75ZM19 6.75H0.9C0.65 6.75 0.4375 6.6625 0.2625 6.4875C0.0875 6.3125 0 6.1 0 5.85V5.3C0 5.11667 0.0458333 4.95833 0.1375 4.825C0.229167 4.69167 0.35 4.58333 0.5 4.5L9.1 0.2C9.38333 0.0666667 9.68333 0 10 0C10.3167 0 10.6167 0.0666667 10.9 0.2L19.45 4.475C19.6333 4.55833 19.7708 4.68333 19.8625 4.85C19.9542 5.01667 20 5.19167 20 5.375V5.75C20 6.03333 19.9042 6.27083 19.7125 6.4625C19.5208 6.65417 19.2833 6.75 19 6.75ZM1 19.75C0.716667 19.75 0.479167 19.6542 0.2875 19.4625C0.0958333 19.2708 0 19.0333 0 18.75C0 18.4667 0.0958333 18.2292 0.2875 18.0375C0.479167 17.8458 0.716667 17.75 1 17.75H11.05C11.3333 17.75 11.5708 17.8458 11.7625 18.0375C11.9542 18.2292 12.05 18.4667 12.05 18.75C12.05 19.0333 11.9542 19.2708 11.7625 19.4625C11.5708 19.6542 11.3333 19.75 11.05 19.75H1ZM16 11.5C15.7167 11.5 15.4792 11.4042 15.2875 11.2125C15.0958 11.0208 15 10.7833 15 10.5V9.75C15 9.46667 15.0958 9.22917 15.2875 9.0375C15.4792 8.84583 15.7167 8.75 16 8.75C16.2833 8.75 16.5208 8.84583 16.7125 9.0375C16.9042 9.22917 17 9.46667 17 9.75V10.5C17 10.7833 16.9042 11.0208 16.7125 11.2125C16.5208 11.4042 16.2833 11.5 16 11.5ZM14 17.3V15.375C14 15.1917 14.0458 15.0167 14.1375 14.85C14.2292 14.6833 14.3667 14.5583 14.55 14.475L17.55 12.975C17.6833 12.8917 17.8333 12.85 18 12.85C18.1667 12.85 18.3167 12.8917 18.45 12.975L21.45 14.475C21.6333 14.5583 21.7708 14.6833 21.8625 14.85C21.9542 15.0167 22 15.1917 22 15.375V17.3C22 18.55 21.675 19.6292 21.025 20.5375C20.375 21.4458 19.4917 22.1333 18.375 22.6C18.3417 22.6167 18.2167 22.6417 18 22.675C17.9667 22.675 17.8417 22.65 17.625 22.6C16.5083 22.1333 15.625 21.4458 14.975 20.5375C14.325 19.6292 14 18.55 14 17.3ZM17.275 17.625L16.825 17.175C16.675 17.025 16.5 16.9542 16.3 16.9625C16.1 16.9708 15.925 17.05 15.775 17.2C15.625 17.35 15.55 17.525 15.55 17.725C15.55 17.925 15.625 18.1 15.775 18.25L16.575 19.05C16.775 19.25 17.0083 19.35 17.275 19.35C17.5417 19.35 17.775 19.25 17.975 19.05L20.225 16.825C20.375 16.675 20.45 16.5 20.45 16.3C20.45 16.1 20.375 15.925 20.225 15.775C20.075 15.625 19.9 15.5542 19.7 15.5625C19.5 15.5708 19.325 15.6417 19.175 15.775L17.275 17.625Z"
      fill="#256B5F"
    />
  </svg>
);

export default function PaymentPayoutCard({
  paymentMethod,
  payoutMethod,
  onPaymentUpdate,
  onPayoutUpdate,
}: PaymentPayoutCardProps) {
  const [editingPayment, setEditingPayment] = useState(false);
  const [editingPayout, setEditingPayout] = useState(false);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    name: "",
    cardNumber: "",
    expiration: "",
    cvv: "",
  });

  // Payout form state
  const [payoutForm, setPayoutForm] = useState<PayoutFormData>({
    accountHolderName: "",
    accountType: "checking",
    routingNumber: "",
    accountNumber: "",
    address: "",
  });

  const handlePaymentSave = () => {
    onPaymentUpdate?.(paymentForm);
    setEditingPayment(false);
  };

  const handlePayoutSave = () => {
    onPayoutUpdate?.(payoutForm);
    setEditingPayout(false);
  };

  return (
    <div className="bg-[#0F0E13] rounded-2xl p-6">
      <div className="flex">
        {/* Payment Method Section */}
        <div className="flex-1 pr-6">
          <h2 className="text-white text-2xl font-bold mb-4">Payment Method</h2>

          {editingPayment ? (
            <div className="space-y-4">
              <div>
                <label className="text-[#ADADAD] text-sm block mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={paymentForm.name}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, name: e.target.value })
                  }
                  placeholder="John Doe"
                  className="w-full bg-[#16151D] border border-[#272727] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple"
                />
              </div>
              <div>
                <label className="text-[#ADADAD] text-sm block mb-1">
                  Card number
                </label>
                <input
                  type="text"
                  value={paymentForm.cardNumber}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      cardNumber: e.target.value,
                    })
                  }
                  placeholder="1234 1234 1234 1234"
                  className="w-full bg-[#16151D] border border-[#272727] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#ADADAD] text-sm block mb-1">
                    Expiration date
                  </label>
                  <input
                    type="text"
                    value={paymentForm.expiration}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        expiration: e.target.value,
                      })
                    }
                    placeholder="MM/YY"
                    className="w-full bg-[#16151D] border border-[#272727] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple"
                  />
                </div>
                <div>
                  <label className="text-[#ADADAD] text-sm block mb-1">
                    CVV
                  </label>
                  <input
                    type="text"
                    value={paymentForm.cvv}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, cvv: e.target.value })
                    }
                    placeholder="CVV"
                    className="w-full bg-[#16151D] border border-[#272727] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setEditingPayment(false)}
                  className="text-[#ADADAD] text-sm font-medium hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaymentSave}
                  className="px-4 py-2 bg-purple text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div>
              {paymentMethod && (
                <div className="flex items-center gap-3 mb-4">
                  <VisaLogo />
                  <span className="text-white text-base font-medium">
                    ...{paymentMethod.lastFour}
                  </span>
                </div>
              )}
              <button
                onClick={() => setEditingPayment(true)}
                className="px-4 py-2 bg-[#262550] border border-purple text-purple text-sm font-semibold rounded-lg hover:bg-purple/20 transition-colors"
              >
                Update Payment Method
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px bg-[#272727] mx-6" />

        {/* Payout Method Section */}
        <div className="flex-1 pl-6">
          <h2 className="text-white text-2xl font-bold mb-4">Payout Method</h2>

          {editingPayout ? (
            <div className="space-y-4">
              <div>
                <label className="text-[#ADADAD] text-sm block mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={payoutForm.accountHolderName}
                  onChange={(e) =>
                    setPayoutForm({
                      ...payoutForm,
                      accountHolderName: e.target.value,
                    })
                  }
                  className="w-full bg-[#16151D] border border-[#272727] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple"
                />
              </div>
              <div>
                <label className="text-[#ADADAD] text-sm block mb-2">
                  Account Type
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={payoutForm.accountType === "checking"}
                      onChange={() =>
                        setPayoutForm({ ...payoutForm, accountType: "checking" })
                      }
                      className="w-4 h-4 accent-purple"
                    />
                    <span className="text-white text-sm">Checking</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={payoutForm.accountType === "savings"}
                      onChange={() =>
                        setPayoutForm({ ...payoutForm, accountType: "savings" })
                      }
                      className="w-4 h-4 accent-purple"
                    />
                    <span className="text-white text-sm">Savings</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-[#ADADAD] text-sm block mb-1">
                  Routing number
                </label>
                <input
                  type="text"
                  value={payoutForm.routingNumber}
                  onChange={(e) =>
                    setPayoutForm({
                      ...payoutForm,
                      routingNumber: e.target.value,
                    })
                  }
                  className="w-full bg-[#16151D] border border-[#272727] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple"
                />
              </div>
              <div>
                <label className="text-[#ADADAD] text-sm block mb-1">
                  Account number
                </label>
                <input
                  type="text"
                  value={payoutForm.accountNumber}
                  onChange={(e) =>
                    setPayoutForm({
                      ...payoutForm,
                      accountNumber: e.target.value,
                    })
                  }
                  className="w-full bg-[#16151D] border border-[#272727] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple"
                />
              </div>
              <div>
                <label className="text-[#ADADAD] text-sm block mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={payoutForm.address}
                  onChange={(e) =>
                    setPayoutForm({ ...payoutForm, address: e.target.value })
                  }
                  className="w-full bg-[#16151D] border border-[#272727] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setEditingPayout(false)}
                  className="text-[#ADADAD] text-sm font-medium hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayoutSave}
                  className="px-4 py-2 bg-purple text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div>
              {payoutMethod && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <BankVerifiedIcon />
                    <span className="text-white text-base font-medium">
                      Bank account: ...{payoutMethod.lastFour}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-white text-base font-medium">
                      Status:
                    </span>
                    <span className="text-[#256B5F] text-xs font-bold">
                      Verified
                    </span>
                  </div>
                </>
              )}
              <button
                onClick={() => setEditingPayout(true)}
                className="px-4 py-2 bg-[#262550] border border-purple text-purple text-sm font-semibold rounded-lg hover:bg-purple/20 transition-colors"
              >
                Update Payout Method
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
