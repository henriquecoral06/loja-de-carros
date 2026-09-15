import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Config } from "@/integrations/supabase/types";

/**
 * Identidade da revenda. Vem do banco, nunca do código — é isso que
 * permite remixar o projeto sem abrir nenhum arquivo .tsx.
 */
export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: async (): Promise<Config> => {
      const { data, error } = await supabase.from("config").select("*").maybeSingle();
      if (error) throw error;
      return data as Config;
    },
    staleTime: 1000 * 60 * 10,
  });
}
