import { useEffect, useState } from 'react';
// @ts-ignore
import { supabase } from './supabaseClient';
import Login from './login.tsx';
import './App.css'; 

function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [pronostici, setPronostici] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [userBets, setUserBets] = useState<any[]>([]);
  const [classifica, setClassifica] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const caricaStorico = async (userId: string) => {
    const { data } = await supabase
      .from('bets')
      .select(`
        id, 
        created_at, 
        predictions (
          prediction, 
          match_id,
          matches (id, home_team, away_team, result, score_home, score_away, home_logo, away_logo)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Calcolo punti con normalizzazione trim()
    const betsConPunti = data?.map((bet: any) => {
      let punti = 0;
      bet.predictions.forEach((p: any) => {
        const res = p.matches?.result?.trim();
        const pred = p.prediction?.trim();
        if (res && res === pred) punti++;
      });
      return { ...bet, puntiTotali: punti };
    });
    setUserBets(betsConPunti || []);
  };

  const caricaClassifica = async () => {
    const { data: profiles } = await supabase.from('profiles').select('id, nickname');
    const { data: allBets } = await supabase.from('bets').select(`
      user_id,
      predictions (
        prediction,
        matches (result)
      )
    `);

    const puntiPerUtente: Record<string, number> = {};
    allBets?.forEach((bet: any) => {
      let puntiBet = 0;
      bet.predictions.forEach((p: any) => {
        const res = p.matches?.result?.trim();
        const pred = p.prediction?.trim();
        if (res && res === pred) puntiBet++;
      });
      puntiPerUtente[bet.user_id] = (puntiPerUtente[bet.user_id] || 0) + puntiBet;
    });

    const classificaOrdinata = Object.entries(puntiPerUtente)
      .map(([id, punti]) => {
        const userProf = profiles?.find(p => p.id === id);
        return { nickname: userProf?.nickname || 'Anonimo', punti };
      })
      .sort((a, b) => b.punti - a.punti);

    setClassifica(classificaOrdinata);
  };

  const syncMatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-matches');
      if (error) throw error;
      alert("✅ " + (data?.message || "Palinsesto aggiornato!"));
      window.location.reload();
    } catch (err: any) { alert("Errore: " + err.message); } finally { setLoading(false); }
  };

  const recuperaRisultati = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-results');
      if (error) throw error;
      alert("🏆 " + (data?.message || "Risultati aggiornati!"));
      window.location.reload();
    } catch (err: any) { alert("Errore: " + err.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (session) {
      const fetchData = async () => {
        setLoading(true);
        const { data: prof } = await supabase.from('profiles').select('nickname, credits').eq('id', session.user.id).single();
        if (prof) setProfile(prof);
        const { data: mtch } = await supabase.from('matches').select('*').order('api_id').limit(13);
        if (mtch) setMatches(mtch);
        await caricaStorico(session.user.id);
        await caricaClassifica();
        setLoading(false);
      };
      fetchData();
    }
  }, [session]);

  const selezionaSegno = (id: string, segno: string) => {
    setPronostici(prev => ({ ...prev, [id]: prev[id] === segno ? '' : segno }));
  };

  const inviaSchedina = async () => {
    if (!profile || profile.credits < 5) return alert("Crediti insufficienti!");
    if (Object.values(pronostici).filter(v => v !== '').length < 13) return alert("Compila tutte le 13 partite!");

    if (userBets.length > 0 && matches.length > 0) {
      const lastMatchId = matches[matches.length - 1].id;
      const giaGiocata = userBets.some(bet => bet.predictions.some((p: any) => p.match_id === lastMatchId));
      if (giaGiocata) return alert("Hai già giocato per questa giornata!");
    }

    setLoading(true);
    try {
      const { data: bet, error: betErr } = await supabase.from('bets').insert([{ user_id: session.user.id, cost: 5 }]).select().single();
      if (betErr) throw betErr;
      const lista = Object.entries(pronostici).map(([mId, pred]) => ({ bet_id: bet.id, match_id: mId, prediction: pred }));
      await supabase.from('predictions').insert(lista);
      await supabase.from('profiles').update({ credits: profile.credits - 5 }).eq('id', session.user.id);
      alert("🔥 SCHEDINA REGISTRATA!");
      window.location.reload();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  if (!session) return <Login />;
  if (loading) return <div style={{padding: '20px', color: 'white'}}>Caricamento...</div>;

  return (
    <div className="container">
      <header className="main-header">
        <div>
          <div className="label-small">UTENTE</div>
          <div className="user-name">{profile?.nickname}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="label-small">SALDO</div>
          <div className="user-credits">{profile?.credits} CR</div>
        </div>
      </header>

      <div className="admin-bar">
        <button className="btn-logout" onClick={() => supabase.auth.signOut()}>Esci</button>
        {session.user.email === 'alloss1979@gmail.com' && (
          <div className="admin-controls">
            <span onClick={syncMatches} className="admin-link blue">🔄 PALINSESTO</span>
            <span onClick={recuperaRisultati} className="admin-link gold">🏆 RISULTATI</span>
          </div>
        )}
      </div>

      <h3 className="section-title">Classifica Generale</h3>
      <div className="card rankings">
        {classifica.length === 0 ? "Ancora nessun punto." : classifica.map((utente, i) => (
          <div key={i} className="classifica-row">
             <span>{i + 1}. <strong>{utente.nickname}</strong></span>
             <span className="punti-badge">{utente.punti} PT</span>
          </div>
        ))}
      </div>

      <h3 className="section-title">La Schedina dei 13</h3>
      {matches.map((m, i) => (
        <div key={m.id} className="card-match">
          <div className="match-info-row">
            <span className="match-number">{i + 1}</span>
            <div className="teams-container">
              <div className="team-item left">
                <span className="team-name">{m.home_team}</span>
                <div className="logo-box">
                  {m.home_logo ? (
                    <img src={m.home_logo} className="team-logo" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = `<div class="logo-fallback">${m.home_team.charAt(0)}</div>`; }} />
                  ) : <div className="logo-fallback">{m.home_team?.charAt(0)}</div>}
                </div>
              </div>
              <div className="score-box">
                {m.score_home !== null ? `${m.score_home} - ${m.score_away}` : 'VS'}
              </div>
              <div className="team-item right">
                <div className="logo-box">
                  {m.away_logo ? (
                    <img src={m.away_logo} className="team-logo" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = `<div class="logo-fallback">${m.away_team.charAt(0)}</div>`; }} />
                  ) : <div className="logo-fallback">{m.away_team?.charAt(0)}</div>}
                </div>
                <span className="team-name">{m.away_team}</span>
              </div>
            </div>
          </div>

          <div className="bet-buttons">
            {['1', 'X', '2'].map(s => (
              <button 
                key={s} 
                onClick={() => selezionaSegno(m.id, s)}
                className={`btn-circle ${pronostici[m.id] === s ? 'active' : ''}`}
              >
                {s}
              </button>
            ))}
          </div>
          {m.result && <div className="result-label">Risultato: {m.result}</div>}
        </div>
      ))}

      {matches.length > 0 && (
        <div className="footer-action">
          <button className="submit-button" onClick={inviaSchedina}>
            INVIA SCHEDINA • 5 CR
          </button>
        </div>
      )}

      <h3 className="section-title">Le mie scommesse</h3>
      <div className="history-list">
        {userBets.map((bet) => (
          <div key={bet.id} className="card history-card">
            <div className="history-header">
              <span className="date-badge">📅 {new Date(bet.created_at).toLocaleDateString()}</span>
              <span className="punti-total">Punti: {bet.puntiTotali}</span>
            </div>
            <div className="history-grid">
              {bet.predictions.map((p: any, idx: number) => {
                const res = p.matches?.result?.trim();
                const pred = p.prediction?.trim();
                const hasResult = res && res !== '';
                const isWon = hasResult && res === pred;

                return (
                  <div key={idx} className={`history-item ${isWon ? 'won' : (hasResult ? 'lost' : '')}`}>
                    <span>{p.matches?.home_team?.substring(0,3)}-{p.matches?.away_team?.substring(0,3)}</span>
                    <strong>{p.prediction} {hasResult ? `(${res})` : ''}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;