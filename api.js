const API_KEY = "40e94a409232598ba1cfd36efe3ad91d";

async function caricaPartiteSerieA(data) {
  const url = `https://v3.football.api-sports.io/fixtures?league=135&season=2025&date=${data}`;

  const r = await fetch(url, {
    headers: { "x-apisports-key": API_KEY }
  });

  const json = await r.json();

  return json.response.map(f => {
    let golCasa = f.goals.home;
    let golTrasf = f.goals.away;

    let segno = "-";
    if (golCasa !== null) {
      if (golCasa > golTrasf) segno = "1";
      else if (golCasa < golTrasf) segno = "2";
      else segno = "X";
    }

    return {
      casa: f.teams.home.name,
      trasferta: f.teams.away.name,
      risultato: segno
    };
  });
}
