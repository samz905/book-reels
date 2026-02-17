"use client";

import Image from "next/image";
import { CreatorProfile } from "@/app/data/mockCreatorData";

interface PublicProfileHeaderProps {
  profile: CreatorProfile;
  subscriptionPrice: number;
  subscriptionDescription: string;
}

export default function PublicProfileHeader({
  profile,
  subscriptionPrice,
  subscriptionDescription,
}: PublicProfileHeaderProps) {
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = `${profile.name} on Oddega`;

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
      } catch {
        console.log("Share cancelled");
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard!");
      } catch {
        console.error("Failed to copy link");
      }
    }
  };

  return (
    <div
      className="rounded-xl p-4 sm:p-6 md:p-8 relative"
      style={{
        background:
          "linear-gradient(180deg, rgba(115, 112, 255, 0) 4.21%, rgba(115, 112, 255, 0.3) 100%), #0F0E13",
      }}
    >
      {/* Main content — stacked on mobile, side-by-side on md+ */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5 md:gap-6">
        {/* Left side: Avatar + Info */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-16 h-16 sm:w-[84px] sm:h-[84px] rounded-full overflow-hidden bg-card-bg-2 flex-shrink-0">
            {profile.avatar ? (
              <Image
                src={profile.avatar}
                alt={profile.name}
                width={84}
                height={84}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-white/50"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </div>

          {/* Name + Username + Bio */}
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-lg sm:text-xl font-bold leading-[25px]">
              {profile.name}
            </h1>
            <p className="text-[#ADADAD] text-sm leading-[19px] tracking-tight mt-1 sm:mt-2">
              @{profile.username}
            </p>
            <p className="text-white text-sm leading-[19px] tracking-tight mt-3 sm:mt-4 line-clamp-2 max-w-[875px]">
              {profile.bio}
            </p>
          </div>
        </div>

        {/* Subscribe button + description — full-width on mobile */}
        <div className="flex flex-col items-stretch md:items-end md:flex-shrink-0">
          <button
            className="px-6 md:px-10 py-3 md:py-3.5 rounded-[14px] font-bold text-white text-base md:text-lg text-center"
            style={{
              background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)",
            }}
          >
            Subscribe for ${subscriptionPrice.toFixed(2)} / month
          </button>
          <p className="text-[#ADADAD] text-xs sm:text-sm leading-6 sm:leading-7 mt-2 text-left md:text-right">
            {subscriptionDescription}
          </p>
        </div>
      </div>

      {/* Stats row + Share button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mt-5 md:mt-6">
        {/* Stats with icons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Stories */}
          <div className="flex items-center gap-1">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className="rotate-180"
            >
              <path
                d="M3.6665 1.3335L3.6665 12.0002C3.29984 12.0002 2.98595 11.8696 2.72484 11.6085C2.46373 11.3474 2.33317 11.0335 2.33317 10.6668L2.33317 2.66683C2.33317 2.30016 2.46373 1.98627 2.72484 1.72516C2.98595 1.46405 3.29984 1.3335 3.6665 1.3335ZM12.3332 0.000163915C12.6998 0.000163947 13.0137 0.130719 13.2748 0.39183C13.5359 0.652942 13.6665 0.96683 13.6665 1.3335L13.6665 12.0002C13.6665 12.3668 13.5359 12.6807 13.2748 12.9418C13.0137 13.2029 12.6998 13.3335 12.3332 13.3335L6.33317 13.3335C5.9665 13.3335 5.65261 13.2029 5.3915 12.9418C5.13039 12.6807 4.99984 12.3668 4.99984 12.0002L4.99984 1.3335C4.99984 0.966829 5.13039 0.652941 5.3915 0.39183C5.65262 0.130718 5.9665 0.000163359 6.33317 0.000163391L12.3332 0.000163915ZM0.999838 2.66683L0.999837 10.6668C0.722059 10.6668 0.485948 10.5696 0.291503 10.3752C0.0970586 10.1807 -0.000162782 9.94461 -0.000162758 9.66683L-0.000162233 3.66683C-0.000162209 3.38905 0.0970592 3.15294 0.291504 2.9585C0.485949 2.76405 0.72206 2.66683 0.999838 2.66683Z"
                fill="#ADADAD"
              />
            </svg>
            <span className="text-[#ADADAD] text-sm sm:text-base font-medium leading-[19px] tracking-tight">
              {profile.storiesCount} Stories
            </span>
          </div>

          {/* Episodes */}
          <div className="flex items-center gap-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#ADADAD" />
              <path d="M10 8.5L15 12L10 15.5V8.5Z" fill="#000" />
            </svg>
            <span className="text-[#ADADAD] text-sm sm:text-base font-medium leading-[19px] tracking-tight">
              {profile.episodesCount} Episodes
            </span>
          </div>

          {/* New Episodes Weekly */}
          <div className="flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1.33333 13.3333C0.966667 13.3333 0.652778 13.2028 0.391667 12.9417C0.130556 12.6806 0 12.3667 0 12V2.66667C0 2.3 0.130556 1.98611 0.391667 1.725C0.652778 1.46389 0.966667 1.33333 1.33333 1.33333H2V0.666667C2 0.477778 2.06389 0.319444 2.19167 0.191667C2.31944 0.0638889 2.47778 0 2.66667 0C2.85556 0 3.01389 0.0638889 3.14167 0.191667C3.26944 0.319444 3.33333 0.477778 3.33333 0.666667V1.33333H8.66667V0.666667C8.66667 0.477778 8.73055 0.319444 8.85833 0.191667C8.98611 0.0638889 9.14444 0 9.33333 0C9.52222 0 9.68056 0.0638889 9.80833 0.191667C9.93611 0.319444 10 0.477778 10 0.666667V1.33333H10.6667C11.0333 1.33333 11.3472 1.46389 11.6083 1.725C11.8694 1.98611 12 2.3 12 2.66667V5.78333C12 5.97222 11.9361 6.13056 11.8083 6.25833C11.6806 6.38611 11.5222 6.45 11.3333 6.45C11.1444 6.45 10.9861 6.38611 10.8583 6.25833C10.7306 6.13056 10.6667 5.97222 10.6667 5.78333V5.33333H1.33333V12H5.2C5.38889 12 5.54722 12.0639 5.675 12.1917C5.80278 12.3194 5.86667 12.4778 5.86667 12.6667C5.86667 12.8556 5.80278 13.0139 5.675 13.1417C5.54722 13.2694 5.38889 13.3333 5.2 13.3333H1.33333ZM10 14C9.07778 14 8.29167 13.675 7.64167 13.025C6.99167 12.375 6.66667 11.5889 6.66667 10.6667C6.66667 9.74444 6.99167 8.95833 7.64167 8.30833C8.29167 7.65833 9.07778 7.33333 10 7.33333C10.9222 7.33333 11.7083 7.65833 12.3583 8.30833C13.0083 8.95833 13.3333 9.74444 13.3333 10.6667C13.3333 11.5889 13.0083 12.375 12.3583 13.025C11.7083 13.675 10.9222 14 10 14ZM10.3333 10.5333V9C10.3333 8.91111 10.3 8.83333 10.2333 8.76667C10.1667 8.7 10.0889 8.66667 10 8.66667C9.91111 8.66667 9.83333 8.7 9.76667 8.76667C9.7 8.83333 9.66667 8.91111 9.66667 9V10.5167C9.66667 10.6056 9.68333 10.6917 9.71667 10.775C9.75 10.8583 9.8 10.9333 9.86667 11L10.8833 12.0167C10.95 12.0833 11.0278 12.1167 11.1167 12.1167C11.2056 12.1167 11.2833 12.0833 11.35 12.0167C11.4167 11.95 11.45 11.8722 11.45 11.7833C11.45 11.6944 11.4167 11.6167 11.35 11.55L10.3333 10.5333Z"
                fill="#ADADAD"
              />
            </svg>
            <span className="text-[#ADADAD] text-sm sm:text-base font-medium leading-[19px] tracking-tight">
              New Episodes Weekly
            </span>
          </div>
        </div>

        {/* Share button */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1 text-[#ADADAD] hover:text-white transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 16.08C17.24 16.08 16.56 16.38 16.04 16.85L8.91 12.7C8.96 12.47 9 12.24 9 12C9 11.76 8.96 11.53 8.91 11.3L15.96 7.19C16.5 7.69 17.21 8 18 8C19.66 8 21 6.66 21 5C21 3.34 19.66 2 18 2C16.34 2 15 3.34 15 5C15 5.24 15.04 5.47 15.09 5.7L8.04 9.81C7.5 9.31 6.79 9 6 9C4.34 9 3 10.34 3 12C3 13.66 4.34 15 6 15C6.79 15 7.5 14.69 8.04 14.19L15.16 18.35C15.11 18.56 15.08 18.78 15.08 19C15.08 20.61 16.39 21.92 18 21.92C19.61 21.92 20.92 20.61 20.92 19C20.92 17.39 19.61 16.08 18 16.08Z"
              fill="#CDCDCD"
            />
          </svg>
          <span className="text-sm sm:text-base font-bold leading-[19px] tracking-tight uppercase">
            Share
          </span>
        </button>
      </div>
    </div>
  );
}
