"use client";

import { useState } from "react";

interface PersonalInfoCardProps {
  name: string;
  email: string;
  onNameUpdate?: (newName: string) => Promise<void>;
  onPasswordUpdate?: (newPassword: string) => Promise<void>;
}

export default function PersonalInfoCard({
  name,
  email,
  onNameUpdate,
  onPasswordUpdate,
}: PersonalInfoCardProps) {
  const [editingName, setEditingName] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [nameValue, setNameValue] = useState(name);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [nameSaving, setNameSaving] = useState(false);
  const [nameStatus, setNameStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleNameSave = async () => {
    setNameSaving(true);
    setNameStatus(null);
    try {
      await onNameUpdate?.(nameValue);
      setEditingName(false);
      setNameStatus({ type: "success", message: "Name updated" });
      setTimeout(() => setNameStatus(null), 3000);
    } catch {
      setNameStatus({ type: "error", message: "Failed to update name" });
    } finally {
      setNameSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (newPassword !== confirmPassword) return;
    if (newPassword.length < 8) return;

    setPasswordSaving(true);
    setPasswordStatus(null);
    try {
      await onPasswordUpdate?.(newPassword);
      setEditingPassword(false);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus({ type: "success", message: "Password updated" });
      setTimeout(() => setPasswordStatus(null), 3000);
    } catch {
      setPasswordStatus({ type: "error", message: "Failed to update password" });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleNameCancel = () => {
    setNameValue(name);
    setEditingName(false);
    setNameStatus(null);
  };

  const handlePasswordCancel = () => {
    setNewPassword("");
    setConfirmPassword("");
    setEditingPassword(false);
    setPasswordStatus(null);
  };

  const EditButton = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="w-9 h-9 rounded-full bg-[#3E3D40] flex items-center justify-center hover:bg-[#4E4D50] transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M2 11.5V14H4.5L11.8733 6.62667L9.37333 4.12667L2 11.5ZM13.8067 4.69333C14.0667 4.43333 14.0667 4.01333 13.8067 3.75333L12.2467 2.19333C11.9867 1.93333 11.5667 1.93333 11.3067 2.19333L10.0867 3.41333L12.5867 5.91333L13.8067 4.69333Z"
          fill="#E8EAED"
        />
      </svg>
    </button>
  );

  return (
    <div className="bg-panel rounded-2xl p-6">
      <h2 className="text-white text-2xl font-bold mb-8">
        Personal Information
      </h2>

      <div className="flex flex-col md:flex-row md:items-end gap-6">
        {/* Name Field */}
        <div className="flex-1">
          <label className="text-[#ADADAD] text-[17px] font-semibold block mb-3">
            Name
          </label>
          {editingName ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="bg-input-dark border border-[#272727] rounded-lg px-4 py-2 text-white text-xl font-semibold focus:outline-none focus:border-purple"
                autoFocus
              />
              <button
                onClick={handleNameCancel}
                disabled={nameSaving}
                className="text-[#ADADAD] text-sm font-medium hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleNameSave}
                disabled={nameSaving || !nameValue.trim()}
                className="px-4 py-2 bg-purple text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {nameSaving ? "Saving..." : "Save"}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-white text-xl font-semibold">{name}</span>
              <EditButton onClick={() => { setEditingName(true); setNameStatus(null); }} />
            </div>
          )}
          {nameStatus && (
            <p className={`text-sm mt-2 ${nameStatus.type === "success" ? "text-[#256B5F]" : "text-[#AE1414]"}`}>
              {nameStatus.message}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-[61px] bg-[#272727]" />

        {/* Email Field */}
        <div className="flex-1">
          <label className="text-[#ADADAD] text-[17px] font-semibold block mb-3">
            Email
          </label>
          <span className="text-white text-xl font-semibold">{email}</span>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-[61px] bg-[#272727]" />

        {/* Password Field */}
        <div className="flex-1">
          <label className="text-[#ADADAD] text-[17px] font-semibold block mb-3">
            Password
          </label>
          {editingPassword ? (
            <div className="space-y-3">
              <div>
                <label className="text-[#ADADAD] text-sm block mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-input-dark border border-[#272727] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple"
                    placeholder="••••••••"
                  />
                </div>
                <p className="text-[#ADADAD] text-xs mt-1">
                  Use at least 8 characters with letters and numbers
                </p>
              </div>
              <div>
                <label className="text-[#ADADAD] text-sm block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-input-dark border border-[#272727] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handlePasswordCancel}
                  disabled={passwordSaving}
                  className="text-[#ADADAD] text-sm font-medium hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordSave}
                  disabled={passwordSaving || newPassword.length < 8 || newPassword !== confirmPassword}
                  className="px-4 py-2 bg-purple text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {passwordSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-white text-xl font-semibold">
                ***********
              </span>
              <EditButton onClick={() => { setEditingPassword(true); setPasswordStatus(null); }} />
            </div>
          )}
          {passwordStatus && (
            <p className={`text-sm mt-2 ${passwordStatus.type === "success" ? "text-[#256B5F]" : "text-[#AE1414]"}`}>
              {passwordStatus.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
