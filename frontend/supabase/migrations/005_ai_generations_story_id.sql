-- Link AI generations to stories
ALTER TABLE ai_generations ADD COLUMN story_id UUID REFERENCES stories(id) ON DELETE SET NULL;
CREATE INDEX idx_ai_generations_story ON ai_generations(story_id);
