-- AI Video Generation persistence
-- Replaces SQLite-based backend persistence with Supabase

CREATE TABLE ai_generations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled',
  style TEXT NOT NULL DEFAULT 'cinematic',
  status TEXT NOT NULL DEFAULT 'drafting',
  film_id TEXT,
  thumbnail_base64 TEXT,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  cost_total DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_film_jobs (
  film_id TEXT PRIMARY KEY,
  generation_id TEXT REFERENCES ai_generations(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  total_shots INTEGER NOT NULL,
  current_shot INTEGER DEFAULT 0,
  phase TEXT DEFAULT 'filming',
  completed_shots JSONB DEFAULT '[]'::jsonb,
  final_video_url TEXT,
  error_message TEXT,
  cost_scene_refs DECIMAL(10,4) DEFAULT 0,
  cost_videos DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_generations_updated ON ai_generations(updated_at DESC);
CREATE INDEX idx_ai_film_jobs_generation ON ai_film_jobs(generation_id);

-- Triggers (update_updated_at_column already exists from 001_initial_schema)
CREATE TRIGGER update_ai_generations_updated_at
  BEFORE UPDATE ON ai_generations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_film_jobs_updated_at
  BEFORE UPDATE ON ai_film_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: open for now (no auth on ai-video page yet)
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_film_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_generations_open" ON ai_generations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "ai_film_jobs_open" ON ai_film_jobs FOR ALL USING (true) WITH CHECK (true);
