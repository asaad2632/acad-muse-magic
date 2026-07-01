import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          window.location.href = "/";
          return;
        }
        setError("تم إنشاء الحساب. سجل الدخول الآن.");
        setMode("signin");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error("[auth] signIn error:", error);
          setError("بيانات الدخول غير صحيحة");
          return;
        }
        if (data.session) {
          window.location.href = "/";
        } else {
          setError("بيانات الدخول غير صحيحة");
        }
      }
    } catch (err: any) {
      console.error("[auth] unexpected:", err);
      setError("حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg,#0f172a,#1e3a8a)",
        fontFamily: "Cairo, sans-serif",
        padding: 16,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          padding: 32,
          borderRadius: 16,
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 20px 60px rgba(0,0,0,.3)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, color: "#0f172a", textAlign: "center" }}>
          📚 الأرشيف الأكاديمي
        </h1>
        <p style={{ textAlign: "center", color: "#64748b", marginTop: 6, marginBottom: 24 }}>
          {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
        </p>

        <label style={{ display: "block", fontSize: 14, color: "#334155", marginBottom: 4 }}>
          البريد الإلكتروني
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            marginBottom: 16,
            fontFamily: "inherit",
            fontSize: 15,
          }}
        />

        <label style={{ display: "block", fontSize: 14, color: "#334155", marginBottom: 4 }}>
          كلمة المرور
        </label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            marginBottom: 16,
            fontFamily: "inherit",
            fontSize: 15,
          }}
        />

        {error && (
          <div
            style={{
              background: "#fef2f2",
              color: "#991b1b",
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 14,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: "#1e3a8a",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {loading ? "..." : mode === "signin" ? "دخول" : "إنشاء حساب"}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
          style={{
            width: "100%",
            marginTop: 12,
            padding: "8px",
            background: "transparent",
            color: "#1e3a8a",
            border: 0,
            cursor: "pointer",
            fontSize: 14,
            fontFamily: "inherit",
          }}
        >
          {mode === "signin" ? "ليس لديك حساب؟ سجل الآن" : "لديك حساب؟ سجل الدخول"}
        </button>
      </form>
    </div>
  );
}

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});
