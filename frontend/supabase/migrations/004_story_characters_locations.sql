-- Story Characters and Locations tables
-- Follows the same pattern as episodes and ebooks tables

-- ============================================
-- story_characters table
-- ============================================
CREATE TABLE story_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age TEXT DEFAULT '',
  gender TEXT DEFAULT '',
  description TEXT DEFAULT '',
  role TEXT DEFAULT 'supporting',
  visual_style TEXT,
  image_base64 TEXT,
  image_mime_type TEXT DEFAULT 'image/png',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_story_characters_story_id ON story_characters(story_id);

CREATE TRIGGER update_story_characters_updated_at
  BEFORE UPDATE ON story_characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE story_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Story characters viewable by story viewers"
  ON story_characters FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stories
    WHERE stories.id = story_characters.story_id
    AND (stories.status = 'published' OR stories.creator_id = auth.uid())
  ));

CREATE POLICY "Creators can insert own story characters"
  ON story_characters FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM stories
    WHERE stories.id = story_id AND stories.creator_id = auth.uid()
  ));

CREATE POLICY "Creators can update own story characters"
  ON story_characters FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM stories
    WHERE stories.id = story_characters.story_id AND stories.creator_id = auth.uid()
  ));

CREATE POLICY "Creators can delete own story characters"
  ON story_characters FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM stories
    WHERE stories.id = story_characters.story_id AND stories.creator_id = auth.uid()
  ));

-- ============================================
-- story_locations table
-- ============================================
CREATE TABLE story_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  atmosphere TEXT DEFAULT '',
  visual_style TEXT,
  image_base64 TEXT,
  image_mime_type TEXT DEFAULT 'image/png',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_story_locations_story_id ON story_locations(story_id);

CREATE TRIGGER update_story_locations_updated_at
  BEFORE UPDATE ON story_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE story_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Story locations viewable by story viewers"
  ON story_locations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stories
    WHERE stories.id = story_locations.story_id
    AND (stories.status = 'published' OR stories.creator_id = auth.uid())
  ));

CREATE POLICY "Creators can insert own story locations"
  ON story_locations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM stories
    WHERE stories.id = story_id AND stories.creator_id = auth.uid()
  ));

CREATE POLICY "Creators can update own story locations"
  ON story_locations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM stories
    WHERE stories.id = story_locations.story_id AND stories.creator_id = auth.uid()
  ));

CREATE POLICY "Creators can delete own story locations"
  ON story_locations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM stories
    WHERE stories.id = story_locations.story_id AND stories.creator_id = auth.uid()
  ));
