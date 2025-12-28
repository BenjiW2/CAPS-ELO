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

type SlotKey = "t1p1" | "t1p2" | "t2p1" | "t2p2";

export default function SubmitMatchPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);

  const [team1p1, setTeam1p1] = useState("");
  const [team1p2, setTeam1p2] = useState("");
  const [team2p1, setTeam2p1] = useState("");
  const [team2p2, setTeam2p2] = useState("");

  const [winner, setWinner] = useState<1 | 2>(1);
  const [note, setNote] = useState("");

  // New player creation UI
  const [newName, setNewName] = useState("");
  const [slot, setSlot] = useState<SlotKey>("t1p1");
  const [creating, setCreating] = useState(false);

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

  function setSlotValue(slotKey: SlotKey, value: string) {
    if (slotKey === "t1p1") setTeam1p1(value);
    if (slotKey === "t1p2") setTeam1p2(value);
    if (slotKey === "t2p1") setTeam2p1(value);
    if (slotKey === "t2p2") setTeam2p2(value);
  }

  async function createPlayerAndAssign() {
    setError(null);
    setMsg(null);

    const name = newName.trim();
    if (name.length < 2) return setError("Name too short.");
    if (name.length > 24) return setError("Name too long.");

    setCreating(true);
    try {
      const { data, error } = await supabase.rpc("create_player", { name });
      if (error) return setError(error.message);

      const newId = data as string;

      // refresh list so the new person appears everywhere
      await loadPlayers();

      // assign to selected slot
      setSlotValue(slot, newId);

      setNewName("");
      setMsg(`Added "${name}" and selected them in the form.`);
    } finally {
      setCreating(false);
    }
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
        2v2. Opponent must confirm before Elo updates. You can also add a new person here.
      </div>

      <hr className="sep" />

      {/* Add new person */}
      <div className="card" style={{ background: "#101014", marginBottom: 12 }}>
        <div className="h2" style={{ marginTop: 0 }}>Add new person</div>
        <div className="row">
          <div className="field" style={{ flex: 2, minWidth: 220 }}>
            <label>Name</label>
            <input
              className="input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. New Guy"
            />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 180 }}>
            <label>Put into slot</label>
            <select className="input" value={slot} onChange={(e) => setSlot(e.target.value as SlotKey)}>
              <option value="t1p1">Team 1 · Player 1</option>
              <option value="t1p2">Team 1 · Player 2</option>
              <option value="t2p1">Team 2 · Player 1</option>
              <option value="t2p2">Team 2 · Player 2</option>
            </select>
          </div>
        </div>

        <button className="button secondary" onClick={createPlayerAndAssign} disabled={creating}>
          {creating ? "Adding…" : "Add person"}
        </button>

        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          If the name already exists, the insert will fail (unique name). In that case, just select them from the dropdowns.
        </div>
      </div>

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
