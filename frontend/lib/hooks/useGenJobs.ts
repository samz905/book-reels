"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GenJob } from "@/lib/supabase/ai-generations";

/**
 * Subscribe to gen_jobs changes for a generation via Supabase Realtime.
 *
 * Returns a reactive list of jobs. When a job's status changes in the DB
 * (e.g. "generating" → "completed"), this hook pushes the update instantly.
 *
 * Usage:
 *   const jobs = useGenJobs(generationId);
 *   // Process completed/failed jobs in a useEffect
 */
export function useGenJobs(generationId: string | null): GenJob[] {
  const [jobs, setJobs] = useState<GenJob[]>([]);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);

  // Fetch current jobs on mount / generationId change
  const fetchJobs = useCallback(async (genId: string) => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("gen_jobs")
        .select("*")
        .eq("generation_id", genId);
      if (data) setJobs(data as GenJob[]);
    } catch (e) {
      console.error("[useGenJobs] fetch error:", e);
    }
  }, []);

  useEffect(() => {
    if (!generationId) {
      setJobs([]);
      return;
    }

    // Initial fetch
    fetchJobs(generationId);

    // Subscribe to Realtime changes
    const supabase = createClient();
    const channel = supabase
      .channel(`gen-jobs-${generationId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "gen_jobs",
          filter: `generation_id=eq.${generationId}`,
        },
        (payload) => {
          const updated = payload.new as GenJob;
          if (!updated?.id) return;

          setJobs((prev) => {
            const idx = prev.findIndex((j) => j.id === updated.id);
            if (idx >= 0) {
              // Update existing
              const next = [...prev];
              next[idx] = updated;
              return next;
            }
            // Insert new
            return [...prev, updated];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Polling fallback: fetch jobs every 30s if any are still generating.
    // Catches missed Realtime updates (websocket drops, long connections, etc).
    const pollInterval = setInterval(() => {
      const hasGenerating = jobs.some((j) => j.status === "generating");
      if (hasGenerating) {
        console.log("[useGenJobs] polling fallback — refetching jobs");
        fetchJobs(generationId);
      }
    }, 30000); // 30 seconds

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      clearInterval(pollInterval);
    };
  }, [generationId, fetchJobs, jobs]);

  return jobs;
}
