import { useEffect, useState } from "react";
import { supabase } from "../supabase";

type ProfileRow = { id: string; display_name: string };

export default function SubmitMatchPage() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [team1p1, setTeam1p1] = useState("");
  const [team1p2, setTeam1p2] = useState("");
  const [team2p1, setTeam2p1] = useState("");
  const [team2p2, setTeam2p2] = useState("");
  const [winner, setWinner] = useState<1 | 2>(1);
  const [note, setNote] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setError(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .order("display_name", { ascending: true })
      .limit(500);

    if (error) return setError(error.message);
    setProfiles((data ?? []) as ProfileRow[]);
  }

  function validateDistinct(ids: string[]) {
    return new Set(ids).size === ids.length;
  }

  async function submit() {
    setError(null);
    setMsg(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id;
    if (!uid) return setError("You must be logged in.");

    const ids = [team1p1, team1p2, team2p1, team2p2];
    if (ids.some((x) => !x)) return setError("Select all 4 players.");
    if (!validateDistinct(ids)) return setError("All 4 players must be distinct.");

    const { error } = await supabase.from("matches").insert({
      team1_p1: team1p1,
      team1_p2: team1p2,
      team2_p1: team2p1,
      team2_p2: team2p2,
      winner,
      submitted_by: uid,
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
          {profiles.map((p) => (
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
        Enter a 2v2. An opponent must confirm before ratings update.
      </div>

      <hr className="sep" />

      <div className="col">
        <div className="h2">Team 1</div>
        <PlayerSelect label="Player 1" value={team1p1} onChange={setTeam1p1} />
        <PlayerSelect label="Player 2" value={team1p2} onChange={setTeam1p2} />

        <div className="h2" style={{ marginTop: 6 }}>Team 2</div>
        <PlayerSelect label="Player 1" value={team2p1} onChange={setTeam2p1} />
        <PlayerSelect label="Player 2" value={team2p2} onChange={setTeam2p2} />

        <div className="field">
          <label>Winner</label>
          <div className="row">
            <button
              className={`button ${winner === 1 ? "" : "secondary"}`}
              onClick={() => setWinner(1)}
              type="button"
            >
              Team 1 won
            </button>
            <button
              className={`button ${winner === 2 ? "" : "secondary"}`}
              onClick={() => setWinner(2)}
              type="button"
            >
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
