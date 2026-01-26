"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import PublicProfileHeader from "../../components/public/PublicProfileHeader";
import PublicStoryCard from "../../components/public/PublicStoryCard";
import { getCreatorByUsername } from "../../data/mockPublicCreators";

export default function PublicCreatorProfilePage() {
  const params = useParams();
  const username = params.username as string;

  // Sticky header state
  const [isSticky, setIsSticky] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // Fetch creator data
  const creator = getCreatorByUsername(username);

  // Handle scroll for sticky effect
  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        const rect = headerRef.current.getBoundingClientRect();
        // Header becomes sticky when it reaches the top of the viewport (after main header)
        setIsSticky(rect.top <= 86);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 404 - Creator not found
  if (!creator) {
    return (
      <div className="min-h-screen bg-gradient-page relative overflow-clip">
        <Header />
        <main className="px-6 py-20 max-w-7xl mx-auto text-center">
          <h1 className="text-white text-3xl font-bold mb-4">
            Creator Not Found
          </h1>
          <p className="text-white/70 text-lg">
            The creator you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-page relative overflow-clip">
      {/* Purple glow effects */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-0 w-[800px] h-[600px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center top, rgba(181, 179, 255, 0.15) 0%, transparent 70%)",
        }}
      />

      <Header />

      {/* Sticky Profile Header */}
      <div
        ref={headerRef}
        className={`sticky top-[86px] z-20 px-6 max-w-7xl mx-auto transition-all ${
          isSticky ? "py-2" : "py-6"
        }`}
      >
        <PublicProfileHeader
          profile={creator.profile}
          subscriptionPrice={creator.subscription.monthlyPrice}
          subscriptionDescription={creator.subscription.description}
          isSticky={isSticky}
        />
      </div>

      {/* Stories List */}
      <main className="px-6 pb-8 max-w-7xl mx-auto">
        <div className="space-y-6">
          {creator.stories.map((story) => (
            <PublicStoryCard key={story.id} story={story} />
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
