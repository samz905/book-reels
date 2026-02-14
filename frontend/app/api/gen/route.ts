import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/api";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface GenRequest {
  generation_id: string;
  job_type: string;
  target_id?: string;
  backend_path: string;
  payload: unknown;
}

/**
 * Unified generation proxy. Persists job status to Supabase so results
 * survive client disconnects (tab close, navigation, etc.).
 *
 * Flow:
 * 1. Upsert gen_job row → status "generating"
 * 2. Forward request to FastAPI backend
 * 3. On success → update gen_job to "completed" with result
 * 4. On failure → update gen_job to "failed" with error
 * 5. Return result (or error) to client
 *
 * Even if the client disconnects at step 2, steps 3-4 still execute
 * because Next.js API routes run to completion server-side.
 */
export async function POST(request: NextRequest) {
  let body: GenRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    generation_id,
    job_type,
    target_id = "",
    backend_path,
    payload,
  } = body;

  if (!generation_id || !job_type || !backend_path) {
    return NextResponse.json(
      { error: "generation_id, job_type, and backend_path are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Step 1: upsert job as "generating"
  const { data: job, error: upsertErr } = await supabase
    .from("gen_jobs")
    .upsert(
      {
        generation_id,
        job_type,
        target_id,
        status: "generating",
        result: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "generation_id,job_type,target_id" }
    )
    .select("id")
    .single();

  if (upsertErr || !job) {
    console.error("gen_jobs upsert error:", upsertErr);
    // Fall through — still try the backend call even if tracking fails
  }

  const jobId = job?.id;

  // Step 2: proxy to FastAPI
  try {
    const backendRes = await fetch(`${BACKEND_URL}${backend_path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}));
      const errorMsg =
        errData.detail || `Backend error: ${backendRes.status}`;

      // Step 4 (failure): persist error
      if (jobId) {
        await supabase
          .from("gen_jobs")
          .update({
            status: "failed",
            error_message: errorMsg,
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }

      return NextResponse.json(
        { error: errorMsg },
        { status: backendRes.status }
      );
    }

    const result = await backendRes.json();

    // Step 3 (success): persist result
    if (jobId) {
      await supabase
        .from("gen_jobs")
        .update({
          status: "completed",
          result,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }

    return NextResponse.json(result);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";

    if (jobId) {
      await supabase
        .from("gen_jobs")
        .update({
          status: "failed",
          error_message: errorMsg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
