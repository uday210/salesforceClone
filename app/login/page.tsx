"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Icon } from "@/lib/icons";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/home");
    });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/home");
        } else {
          setInfo("Account created. If email confirmation is on, check your inbox — otherwise sign in now.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/home");
      }
    } catch (e: any) {
      setError(e.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
          <span className="record-icon" style={{ background: "var(--sf-blue)", display: "inline-flex" }}>
            <Icon name="Briefcase" size={22} />
          </span>
        </div>
        <h1>Salesforce Clone</h1>
        <p className="sub">{mode === "signin" ? "Log in to your org" : "Create your org account"}</p>

        {error && <div className="card-body" style={{ color: "var(--sf-red)", padding: "0.5rem 0", fontSize: "0.85rem" }}>{error}</div>}
        {info && <div className="card-body" style={{ color: "var(--sf-green)", padding: "0.5rem 0", fontSize: "0.85rem" }}>{info}</div>}

        <form onSubmit={submit}>
          {mode === "signup" && (
            <div className="field">
              <label>Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <button className="btn btn-brand" type="submit" disabled={loading} style={{ width: "100%", marginTop: "0.5rem" }}>
            {loading ? "Please wait…" : mode === "signin" ? "Log In" : "Sign Up"}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === "signin" ? (
            <>New here? <a onClick={() => setMode("signup")} style={{ cursor: "pointer" }}>Create an account</a></>
          ) : (
            <>Already have an account? <a onClick={() => setMode("signin")} style={{ cursor: "pointer" }}>Log in</a></>
          )}
        </div>
      </div>
    </div>
  );
}
