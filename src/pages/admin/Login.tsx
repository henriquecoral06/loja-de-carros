import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useConfig } from "@/hooks/useConfig";

export default function Login() {
  const { session, carregando } = useAuth();
  const { data: config } = useConfig();
  const navegar = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!carregando && session) return <Navigate to="/admin" replace />;

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const senha = String(form.get("senha"));
    setEnviando(true);
    setErro("");

    const { error } =
      modo === "entrar"
        ? await supabase.auth.signInWithPassword({ email, password: senha })
        : await supabase.auth.signUp({
            email, password: senha,
            options: {
              emailRedirectTo: `${window.location.origin}/admin`,
              data: { nome: String(form.get("nome") ?? "") },
            },
          });

    setEnviando(false);
    if (error) {
      setErro(
        error.message.includes("Invalid login")
          ? "E-mail ou senha incorretos."
          : error.message.includes("already registered")
          ? "Esse e-mail já tem cadastro. Faça login."
          : error.message,
      );
      return;
    }
    navegar("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-center">{config?.nome ?? "Painel"}</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {modo === "entrar" ? "Acesse o painel da revenda" : "Crie seu acesso"}
        </p>

        <form onSubmit={enviar} className="mt-6 space-y-4 rounded-lg border bg-card p-6">
          {modo === "criar" && (
            <div>
              <label htmlFor="nome" className="text-sm font-medium">Nome</label>
              <input id="nome" name="nome" required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </div>
          )}
          <div>
            <label htmlFor="email" className="text-sm font-medium">E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="senha" className="text-sm font-medium">Senha</label>
            <input id="senha" name="senha" type="password" required minLength={6}
              autoComplete={modo === "entrar" ? "current-password" : "new-password"}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <button type="submit" disabled={enviando}
            className="w-full rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-60">
            {enviando ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar acesso"}
          </button>

          <button type="button" onClick={() => { setModo(modo === "entrar" ? "criar" : "entrar"); setErro(""); }}
            className="w-full text-center text-sm text-muted-foreground hover:underline">
            {modo === "entrar" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          O primeiro usuário criado vira administrador automaticamente.
        </p>
      </div>
    </div>
  );
}
