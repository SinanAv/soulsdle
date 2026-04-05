import { supabase } from '../services/supabase'

export const fetchLatestDailyPick = async (mode) => {
  const { data, error } = await supabase
    .from('daily_picks')
    .select('day,item_key,payload')
    .eq('mode', mode)
    .order('day', { ascending: false })
    .limit(1)

  if (error) {
    return { pick: null, error: error.message || 'Failed to load daily pick' }
  }

  const pick = data?.[0] || null
  if (!pick) {
    return { pick: null, error: 'waiting for daily pick to be ready' }
  }

  return { pick, error: null }
}

