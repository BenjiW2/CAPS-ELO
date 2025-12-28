import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Link } from "react-router-dom";

type ProfileRow = {
  id: string;
  display_name: string;
  rating: number;
  games_played: number;
  wins: number;
  losses: number;
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, rating, games_played, wins, losses")
      .order("rating", { ascending: false })
      .limit(200);

    if (error) return setError(error.message);
    setRows((data ?? []) as ProfileRow[]);
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <div className="h1">Leaderboard</div>
        <button className="button secondary" style={{ width: "auto" }} onClick={load}>
          Refresh
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Mobile-first: card list */}
      <div className="list" style={{ marginTop: 10 }}>
        {rows.map((r, idx) => (
          <div className="item" key={r.id}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 800 }}>
                  #{idx + 1} <Link to={`/player/${r.id}`}>{r.display_name}</Link>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  GP {r.games_played} · {r.wins}–{r.losses}
                </div>
              </div>
              <div className="pill">
                <span className="muted">ELO</span>
                <span style={{ fontWeight: 800 }}>{r.rating}</span>
              </div>
            </div>
          </div>
        ))}

        {rows.length === 0 && <div className="muted">No players yet.</div>}
      </div>
    </div>
  );
}
