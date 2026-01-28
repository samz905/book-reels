/**
 * API Verification Script
 *
 * Tests all API endpoints to ensure they're working correctly.
 * Run this after seeding the database.
 *
 * Usage: npx tsx scripts/verify-api.ts
 *
 * Requirements:
 * - Local dev server running (npm run dev)
 * - Database seeded (npm run seed)
 */

const BASE_URL = process.env.API_URL || "http://localhost:3000";

interface TestResult {
  endpoint: string;
  method: string;
  status: "pass" | "fail";
  statusCode?: number;
  error?: string;
}

const results: TestResult[] = [];

async function testEndpoint(
  method: string,
  path: string,
  options: {
    body?: Record<string, unknown>;
    expectedStatus?: number;
    auth?: string;
  } = {}
): Promise<boolean> {
  const { body, expectedStatus = 200, auth } = options;
  const url = `${BASE_URL}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    headers["Authorization"] = `Bearer ${auth}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const success = response.status === expectedStatus;

    results.push({
      endpoint: path,
      method,
      status: success ? "pass" : "fail",
      statusCode: response.status,
      error: success ? undefined : `Expected ${expectedStatus}, got ${response.status}`,
    });

    return success;
  } catch (error) {
    results.push({
      endpoint: path,
      method,
      status: "fail",
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function runTests() {
  console.log("=".repeat(60));
  console.log("Book Reels API Verification");
  console.log(`Testing against: ${BASE_URL}`);
  console.log("=".repeat(60));
  console.log("");

  // Test Stories API
  console.log("Testing Stories API...");
  await testEndpoint("GET", "/api/stories");
  await testEndpoint("GET", "/api/stories?type=video");
  await testEndpoint("GET", "/api/stories?type=audio");
  await testEndpoint("GET", "/api/stories?category=Thriller");
  await testEndpoint("GET", "/api/stories?limit=5");

  // Test individual story - we need to get an ID first
  const storiesResponse = await fetch(`${BASE_URL}/api/stories`);
  const storiesData = await storiesResponse.json();
  const firstStoryId = storiesData.data?.[0]?.id;

  if (firstStoryId) {
    await testEndpoint("GET", `/api/stories/${firstStoryId}`);

    // Test Episodes API
    console.log("\nTesting Episodes API...");
    await testEndpoint("GET", `/api/stories/${firstStoryId}/episodes`);

    const episodesResponse = await fetch(`${BASE_URL}/api/stories/${firstStoryId}/episodes`);
    const episodesData = await episodesResponse.json();
    const firstEpisodeId = episodesData?.[0]?.id;

    if (firstEpisodeId) {
      await testEndpoint("GET", `/api/episodes/${firstEpisodeId}`);
    }

    // Test Ebooks API
    console.log("\nTesting Ebooks API...");
    await testEndpoint("GET", `/api/stories/${firstStoryId}/ebooks`);
  }

  // Test Profiles API
  console.log("\nTesting Profiles API...");
  await testEndpoint("GET", "/api/profiles/username/luna-steel");
  await testEndpoint("GET", "/api/profiles/username/sarah-mitchell");
  await testEndpoint("GET", "/api/profiles/username/nonexistent-user", { expectedStatus: 404 });

  // Get a profile ID for stats test
  const profileResponse = await fetch(`${BASE_URL}/api/profiles/username/luna-steel`);
  const profileData = await profileResponse.json();
  const creatorId = profileData.id;

  if (creatorId) {
    await testEndpoint("GET", `/api/profiles/${creatorId}`);
    await testEndpoint("GET", `/api/profiles/${creatorId}/stats`);
  }

  // Test validation
  console.log("\nTesting Validation...");
  await testEndpoint("GET", "/api/stories/invalid-uuid", { expectedStatus: 400 });
  await testEndpoint("GET", "/api/profiles/invalid-uuid", { expectedStatus: 400 });
  await testEndpoint("GET", "/api/episodes/invalid-uuid", { expectedStatus: 400 });

  // Test auth-required endpoints (should return 401 without auth)
  console.log("\nTesting Auth Requirements...");
  await testEndpoint("GET", "/api/cart", { expectedStatus: 401 });
  await testEndpoint("GET", "/api/subscriptions", { expectedStatus: 401 });
  await testEndpoint("GET", "/api/purchases", { expectedStatus: 401 });
  await testEndpoint("GET", "/api/creator/settings", { expectedStatus: 401 });
  await testEndpoint("POST", "/api/stories", { body: { title: "Test" }, expectedStatus: 401 });
  await testEndpoint("PUT", `/api/stories/${firstStoryId}`, { body: { title: "Test" }, expectedStatus: 401 });
  await testEndpoint("DELETE", `/api/stories/${firstStoryId}`, { expectedStatus: 401 });

  // Print results
  console.log("\n" + "=".repeat(60));
  console.log("Test Results");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;

  for (const result of results) {
    const icon = result.status === "pass" ? "✓" : "✗";
    const statusInfo = result.statusCode ? ` (${result.statusCode})` : "";
    console.log(`  ${icon} ${result.method} ${result.endpoint}${statusInfo}`);
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
  }

  console.log("\n" + "-".repeat(60));
  console.log(`Total: ${results.length} tests | Passed: ${passed} | Failed: ${failed}`);
  console.log("-".repeat(60));

  if (failed > 0) {
    console.log("\n⚠️  Some tests failed. Check the errors above.");
    process.exit(1);
  } else {
    console.log("\n✅ All tests passed!");
    process.exit(0);
  }
}

// Run the tests
runTests().catch((error) => {
  console.error("Test runner failed:", error);
  process.exit(1);
});
