import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import { TemaDaRevenda } from "@/components/TemaDaRevenda";
import Home from "@/pages/Home";
import Estoque from "@/pages/Estoque";
import Veiculo from "@/pages/Veiculo";
import Sobre from "@/pages/Sobre";
import Contato from "@/pages/Contato";
import NaoEncontrado from "@/pages/NaoEncontrado";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TemaDaRevenda />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/estoque" element={<Estoque />} />
            {/* Slug no padrão marca-modelo-versao-ano, gerado no cadastro. */}
            <Route path="/carros/:slug" element={<Veiculo />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="/contato" element={<Contato />} />
            <Route path="*" element={<NaoEncontrado />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
