import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

type PlayerRow = { id: string; display_name: string; rating: number };

async function getMyPlayerId(authUid: string) {
  const { data, error } = await supabase
    .from("players")
    .select("id")
    .eq("auth_user_id", authUid)
    .single();
  if (error) throw new Error(error.message);
  return (data as any).id as string;
}

export default function SubmitMatchPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [team1p1, setTeam1p1] = useState("");
  const [team1p2, setTeam1p2] = useState("");
  const [team2p1, setTeam2p1] = useState("");
  const [team2p2, setTeam2p2] = useState("");
  const [winner, setWinner] = useState<1 | 2>(1);
  const [note, setNote] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    setError(null);
    const { data, error } = await supabase.rpc("get_leaderboard");
    if (error) return setError(error.message);

    const rows = (data ?? []) as any[];
    const sorted = rows
      .map((r) => ({ id: r.id, display_name: r.display_name, rating: r.rating }))
      .sort((a, b) => a.display_name.localeCompare(b.display_name));

    setPlayers(sorted);
  }

  const allSelected = useMemo(
    () => [team1p1, team1p2, team2p1, team2p2].filter(Boolean),
    [team1p1, team1p2, team2p1, team2p2]
  );

  function validateDistinct(ids: string[]) {
    return new Set(ids).size === ids.length;
  }

  async function submit() {
    setError(null);
    setMsg(null);

    const { data: s } = await supabase.auth.getSession();
    const authUid = s.session?.user.id;
    if (!authUid) return setError("Not logged in.");

    if (allSelected.length !== 4) return setError("Select all 4 players.");
    if (!validateDistinct(allSelected)) return setError("All 4 players must be distinct.");

    let submittedBy: string;
    try {
      submittedBy = await getMyPlayerId(authUid);
    } catch (e: any) {
      return setError(`Account not linked to a player: ${e.message}`);
    }

    const { error } = await supabase.from("matches").insert({
      team1_p1: team1p1,
      team1_p2: team1p2,
      team2_p1: team2p1,
      team2_p2: team2p2,
      winner,
      submitted_by: submittedBy,
      note: note.trim() ? note.trim() : null,
      status: "pending_confirm",
    });

    if (error) return setError(error.message);

    setMsg("Submitted. Waiting for an opponent to confirm.");
    setNote("");
  }

  function PlayerSelect(props: { label: string; value: string; onChange: (v: string) => void }) {
    return (
      <div className="field">
        <label>{props.label}</label>
        <select className="input" value={props.value} onChange={(e) => props.onChange(e.target.value)}>
          <option value="">Select…</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="h1">Submit match</div>
      <div className="muted" style={{ fontSize: 13 }}>
        2v2. Opponent must confirm before Elo updates.
      </div>

      <hr className="sep" />

      <div className="col">
        <div className="h2">Team 1</div>
        <PlayerSelect label="Player 1" value={team1p1} onChange={setTeam1p1} />
        <PlayerSelect label="Player 2" value={team1p2} onChange={setTeam1p2} />

        <div className="h2" style={{ marginTop: 6 }}>
          Team 2
        </div>
        <PlayerSelect label="Player 1" value={team2p1} onChange={setTeam2p1} />
        <PlayerSelect label="Player 2" value={team2p2} onChange={setTeam2p2} />

        <div className="field">
          <label>Winner</label>
          <div className="row">
            <button className={`button ${winner === 1 ? "" : "secondary"}`} onClick={() => setWinner(1)} type="button">
              Team 1 won
            </button>
            <button className={`button ${winner === 2 ? "" : "secondary"}`} onClick={() => setWinner(2)} type="button">
              Team 2 won
            </button>
          </div>
        </div>

        <div className="field">
          <label>Note (optional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <button className="button" onClick={submit}>
          Submit match
        </button>

        {error && <div className="error">{error}</div>}
        {msg && <div className="success">{msg}</div>}
      </div>
    </div>
  );
}
