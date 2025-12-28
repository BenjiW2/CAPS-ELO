import React, { useEffect, useState } from "react";
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
  status: string;
  submitted_by: string;
};

type ProfileMap = Record<string, string>;

export default function PendingPage() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [names, setNames] = useState<ProfileMap>({});
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError(null);
    setMsg(null);

    const { data: mData, error } = await supabase
      .from("matches")
      .select("*")
      .eq("status", "pending_confirm")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return setError(error.message);

    const rows = (mData ?? []) as MatchRow[];
    setMatches(rows);

    const ids = new Set<string>();
    rows.forEach((m) => {
      ids.add(m.team1_p1);
      ids.add(m.team1_p2);
      ids.add(m.team2_p1);
      ids.add(m.team2_p2);
    });

    if (ids.size === 0) {
      setNames({});
      return;
    }

    const { data: pData, error: pErr } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", Array.from(ids));

    if (pErr) return setError(pErr.message);

    const map: ProfileMap = {};
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
    const uid = s.session?.user.id;
    if (!uid) return setError("You must be logged in.");

    const { error } = await supabase
      .from("matches")
      .update({ status, confirmed_by: uid })
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
            Only an opponent of the submitter can confirm/reject.
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
