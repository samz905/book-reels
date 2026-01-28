-- Book Reels Database Schema
-- Initial migration: All tables, enums, RLS policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE story_type AS ENUM ('video', 'audio');
CREATE TYPE content_status AS ENUM ('draft', 'published');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled');
CREATE TYPE cart_item_type AS ENUM ('subscription', 'ebook');

-- ============================================
-- TABLES
-- ============================================

-- 1. Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT,
  is_creator BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Creator Settings
CREATE TABLE creator_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_enabled BOOLEAN DEFAULT false,
  monthly_price DECIMAL(10, 2) DEFAULT 0,
  min_price DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Stories
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_url TEXT,
  type story_type NOT NULL,
  status content_status DEFAULT 'draft',
  view_count INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  genres TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Episodes
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  is_free BOOLEAN DEFAULT false,
  thumbnail_url TEXT,
  media_url TEXT,
  status content_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, number)
);

-- 5. Ebooks
CREATE TABLE ebooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_url TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Subscriptions (user subscribes to creator)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  status subscription_status DEFAULT 'active',
  next_billing TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  canceled_at TIMESTAMPTZ,
  UNIQUE(user_id, creator_id)
);

-- 7. Ebook Purchases
CREATE TABLE ebook_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ebook_id UUID NOT NULL REFERENCES ebooks(id) ON DELETE CASCADE,
  price_paid DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ebook_id)
);

-- 8. Cart Items
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_type cart_item_type NOT NULL,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ebook_id UUID REFERENCES ebooks(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure either creator_id or ebook_id is set based on item_type
  CONSTRAINT valid_cart_item CHECK (
    (item_type = 'subscription' AND creator_id IS NOT NULL AND ebook_id IS NULL) OR
    (item_type = 'ebook' AND ebook_id IS NOT NULL AND creator_id IS NULL)
  )
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_is_creator ON profiles(is_creator);
CREATE INDEX idx_stories_creator_id ON stories(creator_id);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_stories_type ON stories(type);
CREATE INDEX idx_episodes_story_id ON episodes(story_id);
CREATE INDEX idx_ebooks_story_id ON ebooks(story_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_creator_id ON subscriptions(creator_id);
CREATE INDEX idx_ebook_purchases_user_id ON ebook_purchases(user_id);
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_settings_updated_at
  BEFORE UPDATE ON creator_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stories_updated_at
  BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_episodes_updated_at
  BEFORE UPDATE ON episodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ebooks_updated_at
  BEFORE UPDATE ON ebooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebook_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Anyone can read profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- CREATOR SETTINGS POLICIES
-- ============================================

-- Creators can view their own settings
CREATE POLICY "Creators can view own settings"
  ON creator_settings FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can view basic creator settings (for subscription info)
CREATE POLICY "Public can view creator subscription info"
  ON creator_settings FOR SELECT
  USING (true);

-- Creators can update their own settings
CREATE POLICY "Creators can update own settings"
  ON creator_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Creators can insert their own settings
CREATE POLICY "Creators can insert own settings"
  ON creator_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STORIES POLICIES
-- ============================================

-- Published stories are viewable by everyone
CREATE POLICY "Published stories are viewable by everyone"
  ON stories FOR SELECT
  USING (status = 'published' OR auth.uid() = creator_id);

-- Creators can insert their own stories
CREATE POLICY "Creators can insert own stories"
  ON stories FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Creators can update their own stories
CREATE POLICY "Creators can update own stories"
  ON stories FOR UPDATE
  USING (auth.uid() = creator_id);

-- Creators can delete their own stories
CREATE POLICY "Creators can delete own stories"
  ON stories FOR DELETE
  USING (auth.uid() = creator_id);

-- ============================================
-- EPISODES POLICIES
-- ============================================

-- Episodes of published stories are viewable by everyone
-- (For non-free episodes, access control should be at application level)
CREATE POLICY "Episodes are viewable by everyone"
  ON episodes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = episodes.story_id
      AND (stories.status = 'published' OR stories.creator_id = auth.uid())
    )
  );

-- Creators can manage episodes of their own stories
CREATE POLICY "Creators can insert own episodes"
  ON episodes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_id AND stories.creator_id = auth.uid()
    )
  );

CREATE POLICY "Creators can update own episodes"
  ON episodes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_id AND stories.creator_id = auth.uid()
    )
  );

CREATE POLICY "Creators can delete own episodes"
  ON episodes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_id AND stories.creator_id = auth.uid()
    )
  );

-- ============================================
-- EBOOKS POLICIES
-- ============================================

-- Ebooks are viewable by everyone
CREATE POLICY "Ebooks are viewable by everyone"
  ON ebooks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = ebooks.story_id
      AND (stories.status = 'published' OR stories.creator_id = auth.uid())
    )
  );

-- Creators can manage ebooks of their own stories
CREATE POLICY "Creators can insert own ebooks"
  ON ebooks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_id AND stories.creator_id = auth.uid()
    )
  );

CREATE POLICY "Creators can update own ebooks"
  ON ebooks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_id AND stories.creator_id = auth.uid()
    )
  );

CREATE POLICY "Creators can delete own ebooks"
  ON ebooks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_id AND stories.creator_id = auth.uid()
    )
  );

-- ============================================
-- SUBSCRIPTIONS POLICIES
-- ============================================

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = creator_id);

-- Users can create subscriptions
CREATE POLICY "Users can create subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions (cancel)
CREATE POLICY "Users can update own subscriptions"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- EBOOK PURCHASES POLICIES
-- ============================================

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases"
  ON ebook_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create purchases
CREATE POLICY "Users can create purchases"
  ON ebook_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- CART ITEMS POLICIES
-- ============================================

-- Users can view their own cart
CREATE POLICY "Users can view own cart"
  ON cart_items FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add items to their cart
CREATE POLICY "Users can add to own cart"
  ON cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove items from their cart
CREATE POLICY "Users can remove from own cart"
  ON cart_items FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTION: Auto-create profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
