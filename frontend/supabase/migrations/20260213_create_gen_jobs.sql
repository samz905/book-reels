-- Track all generation operations (script, character images, location images, etc.)
-- so results persist even if the client disconnects mid-generation.
-- The Next.js API proxy creates/updates these rows; the frontend checks them on restore.

CREATE TABLE gen_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id TEXT NOT NULL,
  job_type TEXT NOT NULL,
  target_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'generating',
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(generation_id, job_type, target_id)
);

CREATE INDEX idx_gen_jobs_generation_id ON gen_jobs(generation_id);

-- RLS: allow service role and authenticated users (they only see their own via generation_id)
ALTER TABLE gen_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon and authenticated can read own gen_jobs" ON gen_jobs
  FOR SELECT USING (true);

CREATE POLICY "Service role can do everything" ON gen_jobs
  FOR ALL USING (true) WITH CHECK (true);
