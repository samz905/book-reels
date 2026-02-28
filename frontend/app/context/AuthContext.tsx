"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { AccessStatus } from "@/types/database";
import posthog from "posthog-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  accessStatus: AccessStatus | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  accessStatus: null,
  signOut: async () => {},
});

// Singleton client — created once outside the component
const supabase = createClient();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Fetch the user's access_status from their profile (4s timeout via Promise.race)
  const fetchAccessStatus = async (userId: string) => {
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 4000)
      );
      const query = supabase
        .from("profiles")
        .select("access_status")
        .eq("id", userId)
        .single();
      const { data } = await Promise.race([query, timeout]);
      setAccessStatus((data?.access_status as AccessStatus) || "pending");
    } catch {
      setAccessStatus("pending");
    }
  };

  useEffect(() => {
    // Safety net: after 5s, force-resolve both loading AND accessStatus.
    // Invariant: loading=false → accessStatus is non-null (if user exists).
    const timeout = setTimeout(() => {
      setAccessStatus(prev => prev ?? "pending");
      setLoading(false);
    }, 5000);

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      userIdRef.current = session?.user?.id ?? null;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user?.id) {
        try { posthog.identify(session.user.id, { email: session.user.email }); } catch {}
        await fetchAccessStatus(session.user.id);
      }
    }).catch(() => {
      // Supabase unreachable — still unblock the UI
    }).finally(() => {
      clearTimeout(timeout);
      setLoading(false);
    });

    // Listen for subsequent auth changes (sign-in, sign-out, token refresh).
    // Skip INITIAL_SESSION — it's handled by getSession().then() above and
    // would otherwise hold the internal Supabase lock (blocking getSession)
    // while redundantly fetching accessStatus, doubling the load time.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") return;
      const newUserId = session?.user?.id ?? null;
      setSession(session);
      if (newUserId !== userIdRef.current) {
        userIdRef.current = newUserId;
        setUser(session?.user ?? null);

        if (newUserId) {
          setAccessStatus(null); // signal "resolving" so pages show spinner
          try { posthog.identify(newUserId, { email: session?.user?.email }); } catch {}
          await fetchAccessStatus(newUserId);
        } else {
          setAccessStatus(null);
        }
      } else if (event === "USER_UPDATED") {
        // Same user but metadata changed (e.g. name update)
        setUser(session?.user ?? null);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setAccessStatus(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, accessStatus, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
