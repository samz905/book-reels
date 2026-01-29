/**
 * Cleanup script for user management
 *
 * Usage: npx tsx scripts/cleanup-users.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log("=== Listing all profiles ===\n");

  // List all profiles
  const { data: profiles, error: listError } = await supabase
    .from("profiles")
    .select("id, username, name, is_creator, created_at")
    .order("created_at", { ascending: false });

  if (listError) {
    console.error("Error listing profiles:", listError.message);
    return;
  }

  console.log("Current profiles:");
  profiles?.forEach((p) => {
    console.log(`  - ${p.username} (${p.name}) [creator: ${p.is_creator}] id: ${p.id}`);
  });

  // Find and delete samz905 account if it exists
  const samz905 = profiles?.find((p) =>
    p.username?.includes("samz905") ||
    p.name?.toLowerCase().includes("samz905")
  );

  if (samz905) {
    console.log(`\n=== Deleting account: ${samz905.username} (${samz905.id}) ===`);

    // Delete related data first (foreign key constraints)
    await supabase.from("cart_items").delete().eq("user_id", samz905.id);
    await supabase.from("ebook_purchases").delete().eq("user_id", samz905.id);
    await supabase.from("subscriptions").delete().eq("user_id", samz905.id);
    await supabase.from("subscriptions").delete().eq("creator_id", samz905.id);

    // Delete episodes and ebooks for their stories
    const { data: stories } = await supabase
      .from("stories")
      .select("id")
      .eq("creator_id", samz905.id);

    if (stories) {
      for (const story of stories) {
        await supabase.from("episodes").delete().eq("story_id", story.id);
        await supabase.from("ebooks").delete().eq("story_id", story.id);
      }
    }

    await supabase.from("stories").delete().eq("creator_id", samz905.id);
    await supabase.from("creator_settings").delete().eq("user_id", samz905.id);

    const { error: deleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", samz905.id);

    if (deleteError) {
      console.error("Error deleting profile:", deleteError.message);
    } else {
      console.log("Deleted successfully!");
    }
  } else {
    console.log("\nNo samz905 account found.");
  }

  // List auth users to find the samarthzalte905 user
  console.log("\n=== Auth Users ===");
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.log("Could not list auth users (may need admin privileges)");
  } else {
    authUsers?.users.forEach((u) => {
      console.log(`  - ${u.email} (id: ${u.id})`);
    });

    // Delete samz905@hotmail.com auth user
    const samz905Auth = authUsers?.users.find((u) =>
      u.email?.includes("samz905@hotmail")
    );
    if (samz905Auth) {
      console.log(`\n=== Deleting auth user: ${samz905Auth.email} ===`);
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(samz905Auth.id);
      if (deleteAuthError) {
        console.error("Error deleting auth user:", deleteAuthError.message);
      } else {
        console.log("Auth user deleted!");
      }
    }

    // Find samarthzalte905
    const samarthUser = authUsers?.users.find((u) =>
      u.email?.includes("samarthzalte905") || u.email?.includes("samarth")
    );

    if (samarthUser) {
      console.log(`\n=== Found samarthzalte905: ${samarthUser.email} (${samarthUser.id}) ===`);

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", samarthUser.id)
        .single();

      if (existingProfile) {
        console.log("Profile exists:", existingProfile.username);

        // Ensure is_creator is true
        if (!existingProfile.is_creator) {
          console.log("Upgrading to creator...");
          await supabase
            .from("profiles")
            .update({ is_creator: true })
            .eq("id", samarthUser.id);
          console.log("Done!");
        }
      } else {
        console.log("Creating new profile...");
        const { error: createError } = await supabase
          .from("profiles")
          .insert({
            id: samarthUser.id,
            username: "samarthzalte905",
            name: "Samarth Zalte",
            bio: "",
            is_creator: true,
          });

        if (createError) {
          console.error("Error creating profile:", createError.message);
        } else {
          console.log("Profile created!");
        }
      }
    }
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);
