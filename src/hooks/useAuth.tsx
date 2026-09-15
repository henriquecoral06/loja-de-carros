import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/integrations/supabase/types";

interface Auth {
  user: User | null;
  session: Session | null;
  papeis: AppRole[];
  isAdmin: boolean;
  isStaff: boolean;
  carregando: boolean;
  sair: () => Promise<void>;
}

const AuthContext = createContext<Auth>({} as Auth);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [papeis, setPapeis] = useState<AppRole[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Registrar o listener ANTES do getSession, senão um refresh de token
    // que chega no meio do caminho é perdido.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSession(nova);
      if (!nova) setPapeis([]);
      else setTimeout(() => carregarPapeis(nova.user.id), 0);
    });

    supabase.auth.getSession().then(({ data: { session: atual } }) => {
      setSession(atual);
      if (atual) carregarPapeis(atual.user.id).finally(() => setCarregando(false));
      else setCarregando(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function carregarPapeis(userId: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    setPapeis((data ?? []).map((r: any) => r.role as AppRole));
    setCarregando(false);
  }

  const valor: Auth = {
    user: session?.user ?? null,
    session,
    papeis,
    isAdmin: papeis.includes("admin"),
    isStaff: papeis.length > 0,
    carregando,
    sair: async () => { await supabase.auth.signOut(); },
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
