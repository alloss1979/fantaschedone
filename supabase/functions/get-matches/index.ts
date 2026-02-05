import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const API_KEY = 'd78ebff8ca354759bafcf9dbd1a8e4c5'
    const headers = { 'X-Auth-Token': API_KEY }

    // Usiamo matchday per essere sicuri di prendere la giornata corretta
    // Giornata 24 per Serie A (SA) e Premier League (PL)
    const [resA, resP] = await Promise.all([
      fetch('https://api.football-data.org/v4/competitions/SA/matches?matchday=24', { headers }),
      fetch('https://api.football-data.org/v4/competitions/PL/matches?matchday=25', { headers })
    ])

    const dataA = await resA.json()
    const dataP = await resP.json()

    if (!dataA.matches || !dataP.matches) {
      throw new Error("Errore nel recupero dati dall'API");
    }

    const mix = [
      ...dataA.matches.slice(0, 10), // Le 10 di Serie A
      ...dataP.matches.slice(0, 3)   // Le 3 di Premier
    ].map(m => ({
      api_id: m.id,
      home_team: m.homeTeam.shortName || m.homeTeam.name,
      away_team: m.awayTeam.shortName || m.awayTeam.name,
      home_logo: m.homeTeam.crest, 
      away_logo: m.awayTeam.crest,
      score_home: m.score?.fullTime?.home ?? null, // Prende anche i risultati se ci sono
      score_away: m.score?.fullTime?.away ?? null,
      result: m.score?.winner === 'HOME_TEAM' ? '1' : m.score?.winner === 'AWAY_TEAM' ? '2' : m.score?.winner === 'DRAW' ? 'X' : null
    }))

    // Upsert diretto nel database
    const { error } = await supabase.from('matches').upsert(mix, { onConflict: 'api_id' })
    if (error) throw error

    return new Response(JSON.stringify({ message: 'Palinsesto Giornata 24 aggiornato!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})