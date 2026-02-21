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

  // Fetch the user's access_status from their profile
  const fetchAccessStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("access_status")
        .eq("id", userId)
        .single();

      if (data?.access_status) {
        setAccessStatus(data.access_status as AccessStatus);
      } else if (error?.code === "PGRST116" || !data) {
        setAccessStatus("pending");
      } else {
        setAccessStatus("pending");
      }
    } catch {
      setAccessStatus("pending");
    }
  };

  useEffect(() => {
    // Safety net: never show spinner for more than 5s no matter what
    const timeout = setTimeout(() => setLoading(false), 5000);

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

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUserId = session?.user?.id ?? null;
      setSession(session);
      if (newUserId !== userIdRef.current) {
        userIdRef.current = newUserId;
        setUser(session?.user ?? null);

        if (newUserId) {
          try { posthog.identify(newUserId, { email: session?.user?.email }); } catch {}
          await fetchAccessStatus(newUserId);
        } else {
          setAccessStatus(null);
        }
      }
      setLoading(false);
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
