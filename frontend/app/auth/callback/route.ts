import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getPostHogClient } from "@/lib/posthog-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if this user is approved or still pending
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("access_status")
          .eq("id", user.id)
          .single();

        const accessStatus = profile?.access_status ?? "pending";
        const posthog = getPostHogClient();
        posthog.capture({
          distinctId: user.id,
          event: "auth_callback_completed",
          properties: {
            access_status: accessStatus,
            redirected_to: accessStatus !== "approved" ? "waitlist" : next,
            provider: "oauth",
          },
        });
        posthog.identify({
          distinctId: user.id,
          properties: {
            email: user.email,
            access_status: accessStatus,
          },
        });

        if (accessStatus !== "approved") {
          return NextResponse.redirect(`${origin}/waitlist`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
