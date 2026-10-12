-- =========================================================================
-- MYSTRIX — SUPABASE DATABASE SCHEMA FOR MULTIPLAYER LEADERBOARD
-- Project: https://supabase.com/dashboard/project/lzyjfndmzsxtxwbhvlhb
-- =========================================================================

-- 1. Create the teams table to store team names, members, scores, and timings
CREATE TABLE IF NOT EXISTS public.teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lead TEXT DEFAULT '',
  member TEXT DEFAULT '',
  completed_count INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  last_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  room_completions JSONB DEFAULT '{}'::jsonb,
  completions JSONB DEFAULT '[]'::jsonb
);

-- 2. Index for high-performance leaderboard sorting
CREATE INDEX IF NOT EXISTS idx_teams_leaderboard 
  ON public.teams (completed_count DESC, last_completed_at ASC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 4. Set access policies for anon / public players
DROP POLICY IF EXISTS "Allow public read access" ON public.teams;
CREATE POLICY "Allow public read access" 
  ON public.teams FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access" ON public.teams;
CREATE POLICY "Allow public insert access" 
  ON public.teams FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access" ON public.teams;
CREATE POLICY "Allow public update access" 
  ON public.teams FOR UPDATE 
  USING (true);

DROP POLICY IF EXISTS "Allow public delete access" ON public.teams;
CREATE POLICY "Allow public delete access" 
  ON public.teams FOR DELETE 
  USING (true);

-- 5. Enable Realtime broadcasting so all clients see updates live
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'teams'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
  END IF;
END $$;
