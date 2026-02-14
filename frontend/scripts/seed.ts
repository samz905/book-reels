/**
 * Seed script for Book Reels database
 *
 * Creates 10 creators with stories, episodes, and ebooks.
 *
 * Usage: npx tsx scripts/seed.ts
 *
 * Note: This script requires the Supabase service role key to bypass RLS.
 * Set SUPABASE_SERVICE_ROLE_KEY in your .env.local file.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { seedCreators, seedStats } from "./seed-data";

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "Set" : "Missing");
  console.error("- SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "Set" : "Missing");
  process.exit(1);
}

// Create admin client that bypasses RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Generate a consistent UUID from a string seed
function generateUUID(seed: string): string {
  // Simple hash-based UUID generator for reproducible IDs
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  // Convert to UUID format
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-8${hex.slice(1, 4)}-${hex.slice(0, 12).padEnd(12, "0")}`;
}

async function clearExistingData() {
  console.log("Clearing existing seed data...");

  // Delete in order to respect foreign key constraints
  const tables = ["cart_items", "ebook_purchases", "subscriptions", "ebooks", "episodes", "stories", "creator_settings", "profiles"];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      console.log(`  Warning: Could not clear ${table}:`, error.message);
    } else {
      console.log(`  Cleared ${table}`);
    }
  }
}

async function createAuthUser(email: string, password: string, metadata: Record<string, string>) {
  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);

  if (existingUser) {
    console.log(`    User ${email} already exists, using existing ID`);
    return existingUser.id;
  }

  // Create new user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error) {
    throw new Error(`Failed to create user ${email}: ${error.message}`);
  }

  return data.user.id;
}

async function seedDatabase() {
  console.log("Starting database seed...");
  console.log(`Will create: ${seedStats.creators} creators, ${seedStats.totalStories} stories, ${seedStats.totalEpisodes} episodes, ${seedStats.totalEbooks} ebooks`);
  console.log("");

  // Clear existing data first
  await clearExistingData();
  console.log("");

  let creatorsCreated = 0;
  let storiesCreated = 0;
  let episodesCreated = 0;
  let ebooksCreated = 0;

  for (const creator of seedCreators) {
    console.log(`Creating creator: ${creator.name} (@${creator.username})`);

    try {
      // Create auth user
      const email = `${creator.username}@bookreels.test`;
      const userId = await createAuthUser(email, "testpassword123", {
        username: creator.username,
        name: creator.name,
      });

      // Create or update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          username: creator.username,
          name: creator.name,
          bio: creator.bio,
          avatar_url: creator.avatar_url,
          is_creator: creator.is_creator,
        });

      if (profileError) {
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      // Create creator settings
      const { error: settingsError } = await supabase
        .from("creator_settings")
        .upsert({
          user_id: userId,
          subscription_enabled: creator.subscription_enabled,
          monthly_price: creator.monthly_price,
          min_price: creator.min_price,
        }, { onConflict: "user_id" });

      if (settingsError) {
        throw new Error(`Failed to create creator settings: ${settingsError.message}`);
      }

      creatorsCreated++;

      // Create stories for this creator
      for (const story of creator.stories) {
        console.log(`  Creating story: ${story.title}`);

        const { data: storyData, error: storyError } = await supabase
          .from("stories")
          .insert({
            creator_id: userId,
            title: story.title,
            description: story.description,
            cover_url: story.cover_url,
            type: story.type,
            status: story.status,
            genres: story.genres,
            view_count: Math.floor(Math.random() * 10000) + 100,
            likes: Math.floor(Math.random() * 500) + 10,
          })
          .select()
          .single();

        if (storyError) {
          throw new Error(`Failed to create story: ${storyError.message}`);
        }

        storiesCreated++;

        // Create episodes for this story
        for (const episode of story.episodes) {
          const { error: episodeError } = await supabase
            .from("episodes")
            .insert({
              story_id: storyData.id,
              number: episode.number,
              name: episode.name,
              is_free: episode.is_free,
              media_url: episode.media_url,
              status: episode.status,
            });

          if (episodeError) {
            throw new Error(`Failed to create episode: ${episodeError.message}`);
          }

          episodesCreated++;
        }

        console.log(`    Created ${story.episodes.length} episodes`);

        // Create ebooks for this story
        for (const ebook of story.ebooks) {
          const { error: ebookError } = await supabase
            .from("ebooks")
            .insert({
              story_id: storyData.id,
              title: ebook.title,
              description: ebook.description,
              cover_url: ebook.cover_url,
              price: ebook.price,
            });

          if (ebookError) {
            throw new Error(`Failed to create ebook: ${ebookError.message}`);
          }

          ebooksCreated++;
        }

        if (story.ebooks.length > 0) {
          console.log(`    Created ${story.ebooks.length} ebook(s)`);
        }
      }

      console.log(`  Completed: ${creator.stories.length} stories`);
      console.log("");

    } catch (error) {
      console.error(`  Error creating ${creator.name}:`, error);
      console.log("");
    }
  }

  console.log("=".repeat(50));
  console.log("Seed completed!");
  console.log(`  Creators: ${creatorsCreated}`);
  console.log(`  Stories: ${storiesCreated}`);
  console.log(`  Episodes: ${episodesCreated}`);
  console.log(`  Ebooks: ${ebooksCreated}`);
  console.log("=".repeat(50));
}

// Run the seed
seedDatabase()
  .then(() => {
    console.log("\nSeed script finished successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nSeed script failed:", error);
    process.exit(1);
  });
