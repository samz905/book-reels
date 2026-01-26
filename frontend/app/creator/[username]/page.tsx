"use client";

import { useParams } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import PublicProfileHeader from "../../components/public/PublicProfileHeader";
import PublicStoryCard from "../../components/public/PublicStoryCard";
import { getCreatorByUsername } from "../../data/mockPublicCreators";

export default function PublicCreatorProfilePage() {
  const params = useParams();
  const username = params.username as string;

  // Fetch creator data
  const creator = getCreatorByUsername(username);

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
        className="absolute left-1/2 -translate-x-1/2 top-[100px] w-[1400px] h-[300px] pointer-events-none"
        style={{
          background: "rgba(181, 179, 255, 0.4)",
          filter: "blur(95px)",
        }}
      />

      <Header />

      {/* Profile Header */}
      <div className="px-6 py-6 max-w-7xl mx-auto relative z-10">
        <PublicProfileHeader
          profile={creator.profile}
          subscriptionPrice={creator.subscription.monthlyPrice}
          subscriptionDescription={creator.subscription.description}
        />
      </div>

      {/* Stories List */}
      <main className="px-6 pb-8 max-w-7xl mx-auto relative z-10">
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
