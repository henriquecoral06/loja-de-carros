import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useConfig } from "@/hooks/useConfig";
import { Button } from "@/components/ui";

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
    <div className="ds-app relative flex min-h-screen items-center justify-center bg-canvas p-6 font-geist antialiased">
      <div className="ds-dot-grid" aria-hidden="true" />
      <div className="relative w-full max-w-sm">
        <h1 className="text-center text-heading-md text-ink">{config?.nome ?? "Portal"}</h1>
        <p className="mt-1 text-center text-body-sm text-mute">
          {modo === "entrar" ? "Acesse o painel da revenda" : "Crie seu acesso"}
        </p>

        <form onSubmit={enviar} className="premium-card mt-6 space-y-4 p-6">
          {modo === "criar" && (
            <div>
              <label htmlFor="nome" className="mb-1.5 block text-label-md tracking-label text-body">Nome</label>
              <input id="nome" name="nome" required
                className="ds-field" />
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-label-md tracking-label text-body">E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email"
              className="ds-field" />
          </div>
          <div>
            <label htmlFor="senha" className="mb-1.5 block text-label-md tracking-label text-body">Senha</label>
            <input id="senha" name="senha" type="password" required minLength={6}
              autoComplete={modo === "entrar" ? "current-password" : "new-password"}
              className="ds-field" />
          </div>

          {erro && <p className="text-body-sm text-danger-deep">{erro}</p>}

          <Button type="submit" size="lg" disabled={enviando} className="w-full">
            {enviando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar acesso"}
          </Button>

          <button type="button" onClick={() => { setModo(modo === "entrar" ? "criar" : "entrar"); setErro(""); }}
            className="ds-focus w-full rounded-ds-sm text-center text-body-sm text-mute hover:text-ink">
            {modo === "entrar" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
          </button>
        </form>

        <p className="relative mt-4 text-center text-caption text-faint">
          O primeiro usuário criado vira administrador automaticamente.
        </p>
      </div>
    </div>
  );
}
