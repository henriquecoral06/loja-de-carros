import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import AdminLayout from "@/components/admin/AdminLayout";
import { TemaDaRevenda } from "@/components/TemaDaRevenda";
import RolarAoTopo from "@/components/RolarAoTopo";

import Home from "@/pages/Home";
import Estoque from "@/pages/Estoque";
import Veiculo from "@/pages/Veiculo";
import Sobre from "@/pages/Sobre";
import Contato from "@/pages/Contato";
import { Privacidade, Termos } from "@/pages/Legal";
import NaoEncontrado from "@/pages/NaoEncontrado";

import Login from "@/pages/admin/Login";
import Dashboard from "@/pages/admin/Dashboard";
import Veiculos from "@/pages/admin/Veiculos";
import VeiculoForm from "@/pages/admin/VeiculoForm";
import Leads from "@/pages/admin/Leads";
import Configuracao from "@/pages/admin/Configuracao";
import BannerPrompt from "@/pages/admin/BannerPrompt";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TemaDaRevenda />
          <RolarAoTopo />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/estoque" element={<Estoque />} />
              {/* Slug no padrão marca-modelo-versao-ano, gerado no cadastro. */}
              <Route path="/carros/:slug" element={<Veiculo />} />
              <Route path="/sobre" element={<Sobre />} />
              <Route path="/contato" element={<Contato />} />
              <Route path="/privacidade" element={<Privacidade />} />
              <Route path="/termos" element={<Termos />} />
              <Route path="*" element={<NaoEncontrado />} />
            </Route>

            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="veiculos" element={<Veiculos />} />
              <Route path="veiculos/:id" element={<VeiculoForm />} />
              <Route path="leads" element={<Leads />} />
              <Route path="config" element={<Configuracao />} />
              <Route path="banner" element={<BannerPrompt />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
