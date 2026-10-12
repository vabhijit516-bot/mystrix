import { createClient } from '@supabase/supabase-js';

// Supabase Project Configuration
export const SUPABASE_URL = 'https://lzyjfndmzsxtxwbhvlhb.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_F_KVw3OVW8j_ozr-EHn0RQ_4P4Gbbpp';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

/**
 * SQL Schema script to create the required table in Supabase SQL editor:
 * https://supabase.com/dashboard/project/lzyjfndmzsxtxwbhvlhb/sql/new
 */
export const SUPABASE_SCHEMA_SQL = `-- MYSTRIX TEAMS & LEADERBOARD SCHEMA
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/lzyjfndmzsxtxwbhvlhb/sql/new

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

-- Enable Row Level Security (RLS)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Allow public read access to leaderboard
DROP POLICY IF EXISTS "Allow public read access" ON public.teams;
CREATE POLICY "Allow public read access" ON public.teams FOR SELECT USING (true);

-- Allow public insert access for registration
DROP POLICY IF EXISTS "Allow public insert access" ON public.teams;
CREATE POLICY "Allow public insert access" ON public.teams FOR INSERT WITH CHECK (true);

-- Allow public update access for score and room completions
DROP POLICY IF EXISTS "Allow public update access" ON public.teams;
CREATE POLICY "Allow public update access" ON public.teams FOR UPDATE USING (true);

-- Allow public delete access (e.g. for erroris admin reset)
DROP POLICY IF EXISTS "Allow public delete access" ON public.teams;
CREATE POLICY "Allow public delete access" ON public.teams FOR DELETE USING (true);

-- Enable Realtime for live multiplayer leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
`;

let realtimeChannel = null;
let healthCheckStatus = { checked: false, available: false, error: null };

/**
 * Check if the 'teams' table is ready and reachable
 */
export async function checkSupabaseStatus() {
  try {
    const { data, error } = await supabase.from('teams').select('id').limit(1);
    if (error) {
      healthCheckStatus = { checked: true, available: false, error: error.message };
      return healthCheckStatus;
    }
    healthCheckStatus = { checked: true, available: true, error: null };
    return healthCheckStatus;
  } catch (err) {
    healthCheckStatus = { checked: true, available: false, error: err.message };
    return healthCheckStatus;
  }
}

/**
 * Fetch all teams from Supabase sorted by completed rooms (desc) and earliest finish (asc)
 */
export async function fetchAllTeams() {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('completed_count', { ascending: false })
      .order('last_completed_at', { ascending: true, nullsFirst: false });

    if (error) {
      console.warn('[Supabase] fetchAllTeams query error:', error.message);
      return { success: false, error, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error('[Supabase] fetchAllTeams exception:', err);
    return { success: false, error: err, data: [] };
  }
}

/**
 * Register or update team progress in Supabase
 */
export async function syncTeamToSupabase(teamRecord) {
  if (!teamRecord || !teamRecord.name) return { success: false, error: 'Invalid team record' };

  const payload = {
    id: teamRecord.id || `team_${Math.random().toString(36).substring(2, 10)}`,
    name: teamRecord.name,
    lead: teamRecord.lead || '',
    member: teamRecord.member || '',
    completed_count: Number(teamRecord.completed_count || 0),
    score: Number(teamRecord.score ?? ((teamRecord.completed_count || 0) * 100)),
    last_completed_at: teamRecord.last_completed_at || null,
    created_at: teamRecord.created_at || new Date().toISOString(),
    room_completions: teamRecord.room_completions || {},
    completions: teamRecord.completions || []
  };

  try {
    const { data, error } = await supabase
      .from('teams')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      console.warn('[Supabase] syncTeamToSupabase error:', error.message);
      return { success: false, error };
    }

    return { success: true, data: data ? data[0] : payload };
  } catch (err) {
    console.error('[Supabase] syncTeamToSupabase exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Clear all teams from Supabase database (admin reset)
 */
export async function clearAllTeamsFromSupabase() {
  try {
    // Delete all records where id is not null
    const { error } = await supabase
      .from('teams')
      .delete()
      .neq('id', '___non_existent___');

    if (error) {
      console.warn('[Supabase] clearAllTeamsFromSupabase error:', error.message);
      return { success: false, error };
    }
    return { success: true };
  } catch (err) {
    console.error('[Supabase] clearAllTeamsFromSupabase exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Subscribe to realtime updates on 'teams' table
 */
export function subscribeToLeaderboard(onUpdate) {
  if (realtimeChannel) {
    try {
      supabase.removeChannel(realtimeChannel);
    } catch (_) {}
  }

  realtimeChannel = supabase
    .channel('mystrix-leaderboard-live')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'teams'
      },
      (payload) => {
        if (typeof onUpdate === 'function') {
          onUpdate(payload);
        }
      }
    )
    .subscribe((status) => {
      console.log('[Supabase Realtime] Status:', status);
    });

  return realtimeChannel;
}
