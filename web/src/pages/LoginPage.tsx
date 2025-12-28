import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav("/");
    });
  }, [nav]);

  async function signIn() {
    setError(null);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);

    nav("/");
  }

  async function signUp() {
    setError(null);
    setMsg(null);

    if (!displayName.trim()) return setError("Display name is required.");

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return setError(error.message);

    const uid = data.user?.id;
    if (!uid) {
      setMsg("Signed up. Check email if confirmation is required.");
      return;
    }

    const { error: pErr } = await supabase.from("profiles").insert({
      id: uid,
      display_name: displayName.trim(),
    });

    if (pErr) return setError(pErr.message);

    nav("/");
  }

  return (
    <div className="card">
      <div className="h1">{mode === "signin" ? "Sign in" : "Create account"}</div>
      <div className="muted" style={{ fontSize: 13 }}>
        Email + password. (Discord can come later.)
      </div>

      <hr className="sep" />

      <div className="col">
        <div className="field">
          <label>Email</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="field">
          <label>Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {mode === "signup" && (
          <div className="field">
            <label>Display name</label>
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        )}

        <div className="row">
          {mode === "signin" ? (
            <>
              <button className="button" onClick={signIn}>
                Sign in
              </button>
              <button className="button secondary" onClick={() => setMode("signup")}>
                Create account
              </button>
            </>
          ) : (
            <>
              <button className="button" onClick={signUp}>
                Sign up
              </button>
              <button className="button secondary" onClick={() => setMode("signin")}>
                Back to sign in
              </button>
            </>
          )}
        </div>

        {error && <div className="error">{error}</div>}
        {msg && <div className="success">{msg}</div>}
      </div>
    </div>
  );
}
