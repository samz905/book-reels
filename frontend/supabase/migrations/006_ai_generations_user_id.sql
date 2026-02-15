-- Add user_id to ai_generations for proper RLS
-- Existing rows without user_id will be invisible until backfilled

ALTER TABLE ai_generations ADD COLUMN user_id UUID REFERENCES auth.users(id);

CREATE INDEX idx_ai_generations_user ON ai_generations(user_id);

-- Drop the open policies
DROP POLICY IF EXISTS "ai_generations_open" ON ai_generations;
DROP POLICY IF EXISTS "ai_film_jobs_open" ON ai_film_jobs;

-- Users can only see their own generations
CREATE POLICY "Users can view own generations"
  ON ai_generations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own generations"
  ON ai_generations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own generations"
  ON ai_generations FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own generations"
  ON ai_generations FOR DELETE
  USING (user_id = auth.uid());

-- Film jobs: accessible if the parent generation belongs to the user
CREATE POLICY "Users can view own film jobs"
  ON ai_film_jobs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ai_generations
    WHERE ai_generations.id = ai_film_jobs.generation_id
    AND ai_generations.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own film jobs"
  ON ai_film_jobs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM ai_generations
    WHERE ai_generations.id = generation_id
    AND ai_generations.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own film jobs"
  ON ai_film_jobs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM ai_generations
    WHERE ai_generations.id = ai_film_jobs.generation_id
    AND ai_generations.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own film jobs"
  ON ai_film_jobs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM ai_generations
    WHERE ai_generations.id = ai_film_jobs.generation_id
    AND ai_generations.user_id = auth.uid()
  ));
