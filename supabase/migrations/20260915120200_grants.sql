-- =====================================================================
-- Privilégios de tabela.
--
-- RLS e GRANT são camadas diferentes e as duas precisam existir. A policy
-- decide QUAIS LINHAS o papel enxerga; o GRANT decide se ele pode tocar
-- na tabela. Sem o GRANT, o PostgREST devolve 401 antes de avaliar
-- qualquer policy — e foi exatamente o que aconteceu com config e
-- veiculo_fotos na primeira subida.
--
-- Não dependa do "default privileges" do Supabase: ele varia entre o
-- ambiente local e o hospedado, e quem remixar o projeto herda a dúvida.
-- Aqui está explícito.
-- =====================================================================

-- ---------------------------------------------------------------------
-- anon: só o que o site público precisa ler.
-- Sem acesso a veiculos (carrega preço de custo, placa e chassi),
-- sem acesso a leads (a escrita passa pela edge function registrar-lead).
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.config            to anon, authenticated;
grant select on public.marcas            to anon, authenticated;
grant select on public.modelos           to anon, authenticated;
grant select on public.versoes           to anon, authenticated;
grant select on public.opcionais         to anon, authenticated;
grant select on public.veiculo_opcionais to anon, authenticated;
grant select on public.veiculo_fotos     to anon, authenticated;

grant execute on function public.registrar_visualizacao(uuid) to anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_staff(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- authenticated: acesso às tabelas de operação. Quem filtra linha e
-- coluna daqui para a frente é a RLS, não o GRANT — os dois papéis
-- (admin e vendedor) são o mesmo papel Postgres.
-- ---------------------------------------------------------------------
grant select, insert, update, delete on public.veiculos          to authenticated;
grant select, insert, update, delete on public.veiculo_fotos     to authenticated;
grant select, insert, update, delete on public.veiculo_opcionais to authenticated;
grant select, insert, update, delete on public.leads             to authenticated;
grant select, insert                 on public.lead_interacoes   to authenticated;
grant select, insert, update, delete on public.marcas            to authenticated;
grant select, insert, update, delete on public.modelos           to authenticated;
grant select, insert, update, delete on public.versoes           to authenticated;
grant select, insert, update, delete on public.opcionais         to authenticated;
grant update                         on public.config            to authenticated;
grant select                         on public.profiles          to authenticated;
grant update                         on public.profiles          to authenticated;
grant select                         on public.user_roles        to authenticated;
grant select, insert, update, delete on public.user_roles        to authenticated;
grant select                         on public.visualizacoes     to authenticated;
grant select                         on public.auditoria         to authenticated;

-- ---------------------------------------------------------------------
-- Conferência do que continua fechado para o público.
-- Um GRANT acidental nestas tabelas vaza preço de custo ou lista de
-- leads. Ficam revogados de forma explícita.
-- ---------------------------------------------------------------------
revoke all on public.veiculos        from anon;
revoke all on public.leads           from anon;
revoke all on public.lead_interacoes from anon;
revoke all on public.auditoria       from anon;
revoke all on public.visualizacoes   from anon;
revoke all on public.user_roles      from anon;
revoke all on public.profiles        from anon;
revoke insert, update, delete on public.config from anon;

-- ---------------------------------------------------------------------
-- service_role: usado apenas pelas edge functions, do lado do servidor.
-- Ignora RLS, mas continua precisando de privilégio de tabela — é por
-- isso que registrar-lead falhava com 42501 ao gravar o lead.
-- A chave dele nunca chega ao navegador.
-- ---------------------------------------------------------------------
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;
