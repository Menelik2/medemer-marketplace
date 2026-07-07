import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, Crown } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin sign in — ADDIX" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (roles) navigate({ to: "/admin" });
    })();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data: signIn, error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signErr) throw signErr;
      const uid = signIn.user?.id;
      if (!uid) throw new Error("Sign in failed");

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleRow) {
        // Not an admin — sign back out and reject.
        await supabase.auth.signOut();
        throw new Error(
          "This account is not an administrator. Ask an existing admin to grant you access."
        );
      }
      navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ethio-charcoal grid place-items-center px-4 py-10 text-soft-clay">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center leading-none mb-8">
          <span className="inline-flex items-center gap-2 text-heritage-gold">
            <ShieldCheck className="size-5" />
            <span className="text-[10px] uppercase tracking-[0.3em] font-semibold">Restricted</span>
          </span>
          <span className="font-display text-3xl font-bold mt-2">Admin console</span>
          <span className="text-[10px] uppercase tracking-[0.25em] text-heritage-gold/80 font-semibold mt-1">
            ADDIX · Operations
          </span>
        </div>

        <form
          onSubmit={submit}
          className="bg-card text-foreground border border-heritage-gold/30 rounded-2xl p-6 space-y-4 shadow-2xl"
        >
          <div className="flex items-center gap-2 text-heritage-gold">
            <Crown className="size-4" />
            <h1 className="font-display text-lg">Administrator sign in</h1>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Only accounts with the admin role may sign in here.
          </p>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          {error && (
            <p className="text-xs text-heritage-red bg-heritage-red/10 border border-heritage-red/30 rounded-lg p-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full bg-heritage-gold text-ethio-charcoal font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Signing in…" : "Enter admin console"}
          </button>

          <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
            Not an admin?{" "}
            <Link to="/auth" className="underline text-heritage-gold">
              Go to customer sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}