import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabase";

type Player = {
  id: string;
  display_name: string;
  rating: number;
  games_played: number;
  wins: number;
  losses: number;
};

type RatingEvent = {
  created_at: string;
  match_id: string;
  rating_before: number;
  rating_after: number;
  delta: number;
};

export default function PlayerPage() {
  const { id } = useParams();
  const [player, setPlayer] = useState<Player | null>(null);
  const [events, setEvents] = useState<RatingEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    load(id);
  }, [id]);

  async function load(pid: string) {
    setError(null);
    setPlayer(null);

    // Fetch the player by player id from the route
    const { data: pData, error: pErr } = await supabase
      .from("players")
      .select("id, display_name, rating, games_played, wins, losses")
      .eq("id", pid)
      .single();

    if (pErr) return setError(pErr.message);
    setPlayer(pData as Player);

    const { data: eData, error: eErr } = await supabase
      .from("rating_events")
      .select("created_at, match_id, rating_before, rating_after, delta")
      .eq("player_id", pid)
      .order("created_at", { ascending: false })
      .limit(50);

    if (eErr) return setError(eErr.message);
    setEvents((eData ?? []) as RatingEvent[]);
  }

  return (
    <div className="card">
      {error && <div className="error">{error}</div>}

      {!player ? (
        <div className="muted">Loading…</div>
      ) : (
        <>
          <div className="h1">{player.display_name}</div>

          <div className="kv" style={{ marginTop: 10 }}>
            <div className="card">
              <div className="muted" style={{ fontSize: 12 }}>Rating</div>
              <div className="big">{player.rating}</div>
            </div>
            <div className="card">
              <div className="muted" style={{ fontSize: 12 }}>Record</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>
                {player.wins}–{player.losses}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                GP {player.games_played}
              </div>
            </div>
          </div>

          <div className="h2">Recent rating changes</div>

          <div className="list">
            {events.map((e) => (
              <div className="item" key={`${e.match_id}-${e.created_at}`}>
                <div className="muted" style={{ fontSize: 12 }}>
                  {new Date(e.created_at).toLocaleString()}
                </div>
                <div className="row" style={{ justifyContent: "space-between", marginTop: 6 }}>
                  <div className="pill">
                    <span className="muted">Before</span> <strong>{e.rating_before}</strong>
                  </div>
                  <div className="pill">
                    <span className="muted">After</span> <strong>{e.rating_after}</strong>
                  </div>
                  <div className="pill">
                    <span className="muted">Δ</span> <strong>{e.delta}</strong>
                  </div>
                </div>
              </div>
            ))}
            {events.length === 0 && <div className="muted">No matches yet.</div>}
          </div>
        </>
      )}
    </div>
  );
}
