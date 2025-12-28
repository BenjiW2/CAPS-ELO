import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { supabase } from "./supabase";

import LoginPage from "./pages/LoginPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import SubmitMatchPage from "./pages/SubmitMatchPage";
import PendingPage from "./pages/PendingPage";
import PlayerPage from "./pages/PlayerPage";

function useSession() {
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUid(data.session?.user.id ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUid(session?.user.id ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { loading, uid };
}

function RequireAuth(props: { uid: string | null; loading: boolean; children: ReactNode }) {
  const loc = useLocation();
  if (props.loading) return <div className="card">Loading…</div>;
  if (!props.uid) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{props.children}</>;
}

export default function App() {
  const { loading, uid } = useSession();
  const location = useLocation();
  const isDesktop = useMemo(() => window.matchMedia?.("(min-width: 900px)")?.matches ?? false, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="h1">Caps ELO</div>
            <div className="muted" style={{ fontSize: 12 }}>
              Public leaderboard · Name + password login
            </div>
          </div>

          {isDesktop && (
            <div className="row" style={{ alignItems: "center" }}>
              <Link to="/">Leaderboard</Link>
              <Link to="/submit">Submit</Link>
              <Link to="/pending">Pending</Link>
              {uid ? (
                <button className="button secondary" style={{ width: "auto" }} onClick={signOut}>
                  Sign out
                </button>
              ) : (
                <Link to="/login">Login</Link>
              )}
            </div>
          )}
        </div>
      </div>

      <Routes>
        {/* Public */}
        <Route path="/" element={<LeaderboardPage />} />
        <Route path="/player/:id" element={<PlayerPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route
          path="/submit"
          element={
            <RequireAuth uid={uid} loading={loading}>
              <SubmitMatchPage />
            </RequireAuth>
          }
        />
        <Route
          path="/pending"
          element={
            <RequireAuth uid={uid} loading={loading}>
              <PendingPage />
            </RequireAuth>
          }
        />
      </Routes>

      {/* Mobile bottom nav */}
      <div className="bottomNav">
        <div className="bottomNavInner">
          <NavLink to="/" className={({ isActive }) => `navBtn ${isActive ? "active" : ""}`}>
            <strong>Board</strong>
            <span className="muted">Ratings</span>
          </NavLink>

          <NavLink to="/submit" className={({ isActive }) => `navBtn ${isActive ? "active" : ""}`}>
            <strong>Submit</strong>
            <span className="muted">Match</span>
          </NavLink>

          <NavLink to="/pending" className={({ isActive }) => `navBtn ${isActive ? "active" : ""}`}>
            <strong>Pending</strong>
            <span className="muted">Confirm</span>
          </NavLink>

          {uid ? (
            <button
              className={`navBtn ${location.pathname === "/logout" ? "active" : ""}`}
              style={{ border: "none", background: "transparent" }}
              onClick={signOut}
            >
              <strong>Account</strong>
              <span className="muted">Sign out</span>
            </button>
          ) : (
            <NavLink to="/login" className={({ isActive }) => `navBtn ${isActive ? "active" : ""}`}>
              <strong>Login</strong>
              <span className="muted">Claim</span>
            </NavLink>
          )}
        </div>
      </div>
    </div>
  );
}
