-- Add genres to existing stories based on their titles/descriptions

-- Synthetic Dreams - Sci-Fi (AI/future/upload consciousness)
UPDATE stories
SET genres = ARRAY['SCI-FI']
WHERE title ILIKE '%synthetic dreams%' OR title ILIKE '%synthetic%';

-- Midnight Whispers - Thriller (psychological thriller)
UPDATE stories
SET genres = ARRAY['THRILLER', 'MYSTERY']
WHERE title ILIKE '%midnight whispers%' OR title ILIKE '%midnight%';

-- The Shadow Protocol - Thriller/Action (spy thriller)
UPDATE stories
SET genres = ARRAY['THRILLER', 'ACTION']
WHERE title ILIKE '%shadow protocol%' OR title ILIKE '%shadow%';

-- The Paris Letters - Romance (love letters)
UPDATE stories
SET genres = ARRAY['ROMANCE', 'DRAMA']
WHERE title ILIKE '%paris letters%' OR title ILIKE '%paris%' OR title ILIKE '%letters%';

-- Finding My Voice - Drama/Slice of Life (personal journey)
UPDATE stories
SET genres = ARRAY['DRAMA', 'SLICE OF LIFE']
WHERE title ILIKE '%finding my voice%' OR title ILIKE '%finding%voice%';

-- Any story with "love" in title/description - Romance
UPDATE stories
SET genres = ARRAY['ROMANCE']
WHERE genres = '{}' AND (title ILIKE '%love%' OR description ILIKE '%love%');

-- Any story with "thriller" or "murder" or "crime" - Thriller
UPDATE stories
SET genres = ARRAY['THRILLER']
WHERE genres = '{}' AND (title ILIKE '%thriller%' OR description ILIKE '%murder%' OR description ILIKE '%crime%');

-- Any story with "fantasy" or "magic" or "dragon" - Fantasy
UPDATE stories
SET genres = ARRAY['FANTASY']
WHERE genres = '{}' AND (title ILIKE '%fantasy%' OR description ILIKE '%magic%' OR description ILIKE '%dragon%');

-- Any story with "horror" or "scary" or "ghost" - Horror
UPDATE stories
SET genres = ARRAY['HORROR']
WHERE genres = '{}' AND (title ILIKE '%horror%' OR description ILIKE '%scary%' OR description ILIKE '%ghost%');

-- Set remaining stories without genres to OTHER
UPDATE stories
SET genres = ARRAY['OTHER']
WHERE genres = '{}' OR genres IS NULL;
