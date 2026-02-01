"use client";

import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import UnderlineTabs from "../components/UnderlineTabs";

export default function CreateVideoPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#010101]">
      <Header />

      <main className="px-6 pt-6 max-w-[1440px] mx-auto">
        {/* Sub-tabs */}
        <UnderlineTabs
          tabs={[
            { id: "audio", label: "Create AN audio Story" },
            { id: "video", label: "Create a Video story" },
          ]}
          activeTab="video"
          onTabChange={(id) => {
            if (id === "audio") router.push("/create-audio");
          }}
          className="mb-4"
        />

        {/* Main Card Container */}
        <div className="bg-[#0F0E13] rounded-xl min-h-[600px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-6 text-center px-8">
            {/* Video Icon */}
            <div className="w-24 h-24 rounded-full bg-[#16151D] flex items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 8C8.34315 8 7 9.34315 7 11V37C7 38.6569 8.34315 40 10 40H38C39.6569 40 41 38.6569 41 37V11C41 9.34315 39.6569 8 38 8H10ZM13 12H17V16H13V12ZM31 12H35V16H31V12ZM21 12H27V36H21V12ZM13 20H17V28H13V20ZM31 20H35V28H31V20ZM13 32H17V36H13V32ZM31 32H35V36H31V32Z" fill="#B8B6FC"/>
              </svg>
            </div>

            {/* Coming Soon Text */}
            <div className="flex flex-col items-center gap-3">
              <h2
                className="text-3xl font-bold text-white"
                style={{ fontFamily: "Mulish" }}
              >
                Coming Soon
              </h2>
              <p
                className="text-[#ADADAD] text-lg max-w-md"
                style={{ fontFamily: "Mulish" }}
              >
                AI Video Stories are on the way. Create engaging video content with AI-powered narration and visuals.
              </p>
            </div>

            {/* Decorative gradient line */}
            <div className="w-48 h-1 rounded-full bg-gradient-to-r from-[#B8B6FC] via-[#7370FF] to-[#B8B6FC] opacity-60" />

            {/* CTA */}
            <p
              className="text-[#BEC0C9] text-sm mt-2"
              style={{ fontFamily: "Mulish" }}
            >
              In the meantime, try creating an{" "}
              <button
                onClick={() => router.push("/create-audio")}
                className="text-[#B8B6FC] hover:text-white transition-colors underline underline-offset-2"
              >
                Audio Story
              </button>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
