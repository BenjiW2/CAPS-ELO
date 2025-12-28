import { useEffect, useState } from "react";
import { supabase } from "../supabase";

type MatchRow = {
  id: string;
  created_at: string;
  team1_p1: string;
  team1_p2: string;
  team2_p1: string;
  team2_p2: string;
  winner: 1 | 2;
  note: string | null;
};

type PlayerMap = Record<string, string>;

async function getMyPlayerId(authUid: string) {
  const { data, error } = await supabase
    .from("players")
    .select("id")
    .eq("auth_user_id", authUid)
    .single();
  if (error) throw new Error(error.message);
  return (data as any).id as string;
}

export default function PendingPage() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [names, setNames] = useState<PlayerMap>({});
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError(null);
    setMsg(null);

    const { data, error } = await supabase
      .from("matches")
      .select("id, created_at, team1_p1, team1_p2, team2_p1, team2_p2, winner, note")
      .eq("status", "pending_confirm")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return setError(error.message);

    const rows = (data ?? []) as MatchRow[];
    setMatches(rows);

    const ids = Array.from(
      new Set(rows.flatMap((m) => [m.team1_p1, m.team1_p2, m.team2_p1, m.team2_p2]))
    );

    if (ids.length === 0) {
      setNames({});
      return;
    }

    const { data: pData, error: pErr } = await supabase
      .from("players")
      .select("id, display_name")
      .in("id", ids);

    if (pErr) return setError(pErr.message);

    const map: PlayerMap = {};
    (pData ?? []).forEach((p: any) => (map[p.id] = p.display_name));
    setNames(map);
  }

  function name(id: string) {
    return names[id] ?? id.slice(0, 8);
  }

  async function setStatus(matchId: string, status: "confirmed" | "rejected") {
    setError(null);
    setMsg(null);

    const { data: s } = await supabase.auth.getSession();
    const authUid = s.session?.user.id;
    if (!authUid) return setError("Not logged in.");

    let myPid: string;
    try {
      myPid = await getMyPlayerId(authUid);
    } catch (e: any) {
      return setError(`Account not linked to a player: ${e.message}`);
    }

    const { error } = await supabase
      .from("matches")
      .update({ status, confirmed_by: myPid })
      .eq("id", matchId);

    if (error) return setError(error.message);

    setMsg(`Match ${status}.`);
    await load();
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div className="h1">Pending</div>
          <div className="muted" style={{ fontSize: 13 }}>
            You can only confirm/reject matches where you’re on the opposing team (enforced by RLS).
          </div>
        </div>
        <button className="button secondary" style={{ width: "auto" }} onClick={load}>
          Refresh
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {msg && <div className="success">{msg}</div>}

      <div className="list" style={{ marginTop: 10 }}>
        {matches.map((m) => (
          <div className="item" key={m.id}>
            <div className="muted" style={{ fontSize: 12 }}>
              {new Date(m.created_at).toLocaleString()}
            </div>

            <div style={{ marginTop: 8 }}>
              <div>
                <strong>Team 1:</strong> {name(m.team1_p1)} + {name(m.team1_p2)}{" "}
                {m.winner === 1 ? <span className="pill" style={{ marginLeft: 8 }}>won</span> : null}
              </div>
              <div>
                <strong>Team 2:</strong> {name(m.team2_p1)} + {name(m.team2_p2)}{" "}
                {m.winner === 2 ? <span className="pill" style={{ marginLeft: 8 }}>won</span> : null}
              </div>
              {m.note ? <div className="muted" style={{ marginTop: 8 }}>Note: {m.note}</div> : null}
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <button className="button" onClick={() => setStatus(m.id, "confirmed")}>
                Confirm
              </button>
              <button className="button danger" onClick={() => setStatus(m.id, "rejected")}>
                Reject
              </button>
            </div>
          </div>
        ))}

        {matches.length === 0 && <div className="muted">No pending matches visible.</div>}
      </div>
    </div>
  );
}
