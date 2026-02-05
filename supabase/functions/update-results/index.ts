import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = { 
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' 
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

    // 1. Recuperiamo i dati live/finali dalle API
    const [resA, resP] = await Promise.all([
      fetch('https://api.football-data.org/v4/competitions/SA/matches', { headers }),
      fetch('https://api.football-data.org/v4/competitions/PL/matches', { headers })
    ])
    
    const dataA = await resA.json()
    const dataP = await resP.json()
    const allMatches = [...(dataA.matches || []), ...(dataP.matches || [])]

    // 2. Prepariamo gli aggiornamenti includendo i GOL
    const updates = allMatches.map(m => {
      let res = null
      // Prendi il punteggio FullTime, se nullo prova HalfTime (per i Live)
      const homeScore = m.score.fullTime.home !== null ? m.score.fullTime.home : m.score.halfTime.home
      const awayScore = m.score.fullTime.away !== null ? m.score.fullTime.away : m.score.halfTime.away
      
      // Calcola il segno 1X2 solo se la partita è iniziata o finita
      if (m.status === 'FINISHED' || m.status === 'IN_PLAY' || m.status === 'PAUSED') {
        if (homeScore > awayScore) res = '1'
        else if (homeScore < awayScore) res = '2'
        else res = 'X'
      }

      return { 
        api_id: m.id, 
        result: res,
        score_home: homeScore,
        score_away: awayScore
      }
    }).filter(u => u.result !== null)

    // 3. Aggiorniamo il database
    for (const u of updates) {
      await supabase
        .from('matches')
        .update({ 
          result: u.result,
          score_home: u.score_home,
          score_away: u.score_away
        })
        .eq('api_id', u.api_id)
    }

    return new Response(JSON.stringify({ message: "Risultati e punteggi aggiornati!" }), {
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