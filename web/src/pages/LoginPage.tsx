import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { useLocation, useNavigate } from "react-router-dom";

type SearchRow = { id: string; display_name: string; claimed: boolean };

function syntheticEmail(playerId: string) {
  return `${playerId}@caps.local`;
}

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();

  const from = (loc.state as any)?.from ?? "/";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchRow[]>([]);
  const [selected, setSelected] = useState<SearchRow | null>(null);

  const [newName, setNewName] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const canAct = useMemo(() => !!selected && password.length >= 6, [selected, password]);

  useEffect(() => {
    // if already logged in, go back
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav(from);
    });
  }, [nav, from]);

  useEffect(() => {
    const t = setTimeout(() => {
      search(query.trim());
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  async function search(q: string) {
    setError(null);

    const { data, error } = await supabase.rpc("search_players", { q });
    if (error) return setError(error.message);

    setResults((data ?? []) as SearchRow[]);
  }

  async function createPlayer() {
    setError(null);
    setMsg(null);

    const name = newName.trim();
    if (name.length < 2) return setError("Name too short.");
    if (name.length > 24) return setError("Name too long.");

    const { data, error } = await supabase.rpc("create_player", { name });
    if (error) return setError(error.message);

    const id = data as string;
    const created: SearchRow = { id, display_name: name, claimed: false };
    setSelected(created);
    setPassword("");
    setMsg("Player created. Set a password to claim it.");
  }

  async function claimSelected() {
    setError(null);
    setMsg(null);
    if (!selected) return;

    if (selected.claimed) return setError("That name is already claimed.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    const email = syntheticEmail(selected.id);

    // Create auth user (email confirmations should be OFF in Supabase)
    const { error: signUpErr } = await supabase.auth.signUp({ email, password });
    if (signUpErr) return setError(signUpErr.message);

    // Link this auth user to the player row
    const { error: claimErr } = await supabase.rpc("claim_player", { pid: selected.id });
    if (claimErr) return setError(claimErr.message);

    nav(from);
  }

  async function signIn() {
    setError(null);
    setMsg(null);
    if (!selected) return;

    if (password.length < 6) return setError("Password must be at least 6 characters.");

    const email = syntheticEmail(selected.id);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);

    nav(from);
  }

  return (
    <div className="card">
      <div className="h1">Login</div>
      <div className="muted" style={{ fontSize: 13 }}>
        Pick your name (existing) or create a new one, then set a password. No emails.
      </div>

      <hr className="sep" />

      <div className="col">
        <div className="field">
          <label>Search names</label>
          <input
            className="input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setMsg(null);
              setError(null);
            }}
            placeholder="Start typing…"
          />
        </div>

        <div className="list">
          {results.map((r) => (
            <button
              key={r.id}
              className="item"
              style={{
                textAlign: "left",
                cursor: "pointer",
                borderColor: selected?.id === r.id ? "#3b3b59" : undefined,
              }}
              onClick={() => {
                setSelected(r);
                setMsg(null);
                setError(null);
                setPassword("");
              }}
            >
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 800 }}>{r.display_name}</div>
                <div className="pill">{r.claimed ? "claimed" : "unclaimed"}</div>
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                {r.claimed ? "Sign in with password." : "Set a password to claim this name."}
              </div>
            </button>
          ))}
          {results.length === 0 && <div className="muted">No matches.</div>}
        </div>

        <hr className="sep" />

        <div className="h2">Create new name</div>
        <div className="field">
          <label>New name</label>
          <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </div>
        <button className="button secondary" onClick={createPlayer}>
          Create name
        </button>

        <hr className="sep" />

        <div className="h2">Password</div>
        <div className="field">
          <label>{selected ? `For: ${selected.display_name}` : "Select a name first"}</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 6 characters"
            disabled={!selected}
          />
        </div>

        {selected?.claimed ? (
          <button className="button" onClick={signIn} disabled={!canAct}>
            Sign in
          </button>
        ) : (
          <button className="button" onClick={claimSelected} disabled={!canAct}>
            Claim name (set password)
          </button>
        )}

        {error && <div className="error">{error}</div>}
        {msg && <div className="success">{msg}</div>}
      </div>
    </div>
  );
}
