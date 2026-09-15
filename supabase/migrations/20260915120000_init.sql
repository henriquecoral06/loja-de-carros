-- =====================================================================
-- Revenda de Veículos — schema inicial
-- Projeto de instância única por revenda (remixável). Sem multi-tenant:
-- cada revenda roda seu próprio projeto Supabase, com seus próprios dados.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.app_role        as enum ('admin', 'vendedor');
create type public.veiculo_status  as enum ('rascunho', 'disponivel', 'reservado', 'vendido', 'oculto');
create type public.origem_cadastro as enum ('fipe', 'manual');
create type public.lead_status     as enum ('novo', 'em_atendimento', 'proposta', 'negociacao', 'vendido', 'perdido');
create type public.lead_tipo       as enum ('whatsapp', 'formulario', 'avaliacao_troca', 'alerta_preco', 'simulacao');
create type public.motivo_perda    as enum ('preco', 'comprou_outro_lugar', 'credito_negado', 'sem_retorno', 'outro');

-- ---------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- Papéis de usuário
-- Tabela separada de propósito: papel guardado em tabela editável pelo
-- próprio usuário é escalada de privilégio. has_role() é SECURITY DEFINER
-- para não criar recursão nas policies.
-- =====================================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null default '',
  telefone    text,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.user_roles (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role    public.app_role not null,
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id);
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', ''));
  -- O primeiro usuário do projeto vira admin. Os demais entram sem papel
  -- e precisam ser liberados por um admin.
  if (select count(*) from public.user_roles) = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Configuração da revenda (registro único)
-- =====================================================================
create table public.config (
  id                  boolean primary key default true check (id),
  nome                text not null default 'Minha Revenda',
  razao_social        text,
  cnpj                text,
  telefone            text,
  whatsapp            text,
  email               text,
  endereco            text,
  cidade              text,
  uf                  text,
  cep                 text,
  latitude            numeric,
  longitude           numeric,
  logo_url            text,
  favicon_url         text,
  banner_url          text,
  -- Cores em HSL sem função ("212 86% 27%"), para entrar direto nos tokens
  -- do Tailwind/shadcn sem conversão no runtime.
  cor_primaria        text not null default '191 78% 21%',
  cor_primaria_fg     text not null default '0 0% 100%',
  cor_destaque        text not null default '35 92% 33%',
  texto_home          text,
  texto_sobre         text,
  horarios            jsonb not null default '[]'::jsonb,
  redes_sociais       jsonb not null default '{}'::jsonb,
  meta_title          text,
  meta_description    text,
  ga_measurement_id   text,
  gtm_id              text,
  meta_pixel_id       text,
  dias_alerta_parado  integer not null default 60,
  updated_at          timestamptz not null default now()
);

create trigger set_config_updated_at before update on public.config
  for each row execute function public.tg_set_updated_at();

-- =====================================================================
-- Base FIPE: marca > modelo > versao
-- Sincronizada mensalmente. Registros criados por digitação manual entram
-- com revisada = false para o admin conferir depois.
-- =====================================================================
create table public.marcas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  codigo_fipe text,
  revisada    boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.modelos (
  id          uuid primary key default gen_random_uuid(),
  marca_id    uuid not null references public.marcas(id) on delete cascade,
  nome        text not null,
  codigo_fipe text,
  revisada    boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (marca_id, nome)
);

create table public.versoes (
  id          uuid primary key default gen_random_uuid(),
  modelo_id   uuid not null references public.modelos(id) on delete cascade,
  nome        text not null,
  codigo_fipe text,
  combustivel text,
  revisada    boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (modelo_id, nome)
);

create index on public.modelos (marca_id);
create index on public.versoes (modelo_id);

-- =====================================================================
-- Veículos
-- =====================================================================
create table public.veiculos (
  id                 uuid primary key default gen_random_uuid(),
  versao_id          uuid references public.versoes(id) on delete restrict,
  codigo_interno     text,
  slug               text not null unique,

  ano_fabricacao     integer not null,
  ano_modelo         integer not null,
  km                 integer not null default 0,
  cambio             text not null,
  combustivel        text not null,
  cor                text not null,
  cor_interna        text,
  carroceria         text not null,
  portas             smallint not null default 4,
  motor              text,
  potencia_cv        integer,
  final_placa        smallint,
  blindado           boolean not null default false,
  pcd                boolean not null default false,

  preco              numeric(12,2) not null,
  preco_promocional  numeric(12,2),
  promo_inicio       date,
  promo_fim          date,
  preco_sob_consulta boolean not null default false,
  aceita_troca       boolean not null default true,
  aceita_financiamento boolean not null default true,
  entrada_minima     numeric(12,2),

  -- Somente admin. Nunca exposto na view pública.
  preco_custo        numeric(12,2),
  placa              text,
  chassi             text,

  valor_fipe         numeric(12,2),
  fipe_consultado_em date,
  origem_cadastro    public.origem_cadastro not null default 'fipe',

  unico_dono         boolean not null default false,
  ipva_pago          boolean not null default false,
  licenciado         boolean not null default false,
  laudo_cautelar     boolean not null default false,
  manual_chave       boolean not null default false,
  garantia_fabrica   date,

  descricao          text,
  video_url          text,

  status             public.veiculo_status not null default 'rascunho',
  destaque           boolean not null default false,
  ordem              integer not null default 0,
  entrada_estoque    date not null default current_date,
  vendido_em         date,

  meta_title         text,
  meta_description   text,

  criado_por         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

-- Índices dos campos filtráveis (seção 6 do escopo).
create index veiculos_status_idx      on public.veiculos (status) where deleted_at is null;
create index veiculos_preco_idx       on public.veiculos (preco);
create index veiculos_ano_idx         on public.veiculos (ano_modelo);
create index veiculos_km_idx          on public.veiculos (km);
create index veiculos_versao_idx      on public.veiculos (versao_id);
create index veiculos_destaque_idx    on public.veiculos (destaque, ordem);
create index veiculos_cambio_idx      on public.veiculos (cambio);
create index veiculos_combustivel_idx on public.veiculos (combustivel);
create index veiculos_carroceria_idx  on public.veiculos (carroceria);

create trigger set_veiculos_updated_at before update on public.veiculos
  for each row execute function public.tg_set_updated_at();

create table public.veiculo_fotos (
  id         uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references public.veiculos(id) on delete cascade,
  url        text not null,
  ordem      integer not null default 0,
  capa       boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.veiculo_fotos (veiculo_id, ordem);

create table public.opcionais (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null unique,
  categoria  text,
  ordem      integer not null default 0
);

create table public.veiculo_opcionais (
  veiculo_id  uuid not null references public.veiculos(id) on delete cascade,
  opcional_id uuid not null references public.opcionais(id) on delete cascade,
  primary key (veiculo_id, opcional_id)
);

-- =====================================================================
-- Leads
-- =====================================================================
create table public.leads (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  whatsapp         text not null,
  email            text,
  veiculo_id       uuid references public.veiculos(id) on delete set null,
  vendedor_id      uuid references auth.users(id) on delete set null,
  tipo             public.lead_tipo not null default 'formulario',
  status           public.lead_status not null default 'novo',
  motivo_perda     public.motivo_perda,
  mensagem         text,
  observacoes      text,
  origem           text,
  utm_source       text,
  utm_medium       text,
  utm_campaign     text,
  pagina_origem    text,
  consentimento_em timestamptz,
  ip               inet,
  primeira_resposta_em timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.leads (status, created_at desc);
create index on public.leads (vendedor_id);
create index on public.leads (whatsapp);

create trigger set_leads_updated_at before update on public.leads
  for each row execute function public.tg_set_updated_at();

create table public.lead_interacoes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  usuario_id uuid references auth.users(id) on delete set null,
  texto      text not null,
  canal      text not null default 'nota',
  created_at timestamptz not null default now()
);
create index on public.lead_interacoes (lead_id, created_at desc);

-- Marca o tempo da primeira resposta: é a métrica que mais pesa na conversão.
create or replace function public.tg_marcar_primeira_resposta()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.leads
     set primeira_resposta_em = now(),
         status = case when status = 'novo' then 'em_atendimento' else status end
   where id = new.lead_id
     and primeira_resposta_em is null
     and new.usuario_id is not null;
  return new;
end;
$$;

create trigger marcar_primeira_resposta after insert on public.lead_interacoes
  for each row execute function public.tg_marcar_primeira_resposta();

-- =====================================================================
-- Visualizações e auditoria
-- =====================================================================
create table public.visualizacoes (
  veiculo_id uuid not null references public.veiculos(id) on delete cascade,
  dia        date not null default current_date,
  total      integer not null default 0,
  primary key (veiculo_id, dia)
);

create or replace function public.registrar_visualizacao(_veiculo_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.visualizacoes (veiculo_id, dia, total)
  values (_veiculo_id, current_date, 1)
  on conflict (veiculo_id, dia) do update set total = public.visualizacoes.total + 1;
end;
$$;

create table public.auditoria (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id) on delete set null,
  entidade   text not null,
  entidade_id uuid,
  acao       text not null,
  antes      jsonb,
  depois     jsonb,
  created_at timestamptz not null default now()
);
create index on public.auditoria (entidade, entidade_id, created_at desc);

create or replace function public.tg_auditar_veiculo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (old.preco is distinct from new.preco or old.status is distinct from new.status) then
    insert into public.auditoria (usuario_id, entidade, entidade_id, acao, antes, depois)
    values (auth.uid(), 'veiculo', new.id, 'alteracao',
            jsonb_build_object('preco', old.preco, 'status', old.status),
            jsonb_build_object('preco', new.preco, 'status', new.status));
  end if;
  return new;
end;
$$;

create trigger auditar_veiculo after update on public.veiculos
  for each row execute function public.tg_auditar_veiculo();

-- =====================================================================
-- RLS
-- Ponto crítico deste projeto: a anon key vai embutida no bundle do
-- navegador. Quem remixar herda essas policies — elas são a única coisa
-- separando o preço de custo do público.
-- =====================================================================
alter table public.profiles          enable row level security;
alter table public.user_roles        enable row level security;
alter table public.config            enable row level security;
alter table public.marcas            enable row level security;
alter table public.modelos           enable row level security;
alter table public.versoes           enable row level security;
alter table public.veiculos          enable row level security;
alter table public.veiculo_fotos     enable row level security;
alter table public.opcionais         enable row level security;
alter table public.veiculo_opcionais enable row level security;
alter table public.leads             enable row level security;
alter table public.lead_interacoes   enable row level security;
alter table public.visualizacoes     enable row level security;
alter table public.auditoria         enable row level security;

-- profiles ------------------------------------------------------------
create policy "perfil proprio visivel" on public.profiles
  for select using (auth.uid() = id or public.is_staff(auth.uid()));
create policy "edita proprio perfil" on public.profiles
  for update using (auth.uid() = id);
create policy "admin gerencia perfis" on public.profiles
  for all using (public.has_role(auth.uid(), 'admin'));

-- user_roles ----------------------------------------------------------
-- Ninguém edita o próprio papel. Só admin escreve aqui.
create policy "ve proprios papeis" on public.user_roles
  for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "admin gerencia papeis" on public.user_roles
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- config --------------------------------------------------------------
create policy "config publica" on public.config for select using (true);
create policy "admin edita config" on public.config
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- base FIPE (leitura pública: alimenta os filtros) ----------------------
create policy "marcas publicas"  on public.marcas  for select using (true);
create policy "modelos publicos" on public.modelos for select using (true);
create policy "versoes publicas" on public.versoes for select using (true);
create policy "staff escreve marcas"  on public.marcas  for all using (public.is_staff(auth.uid()));
create policy "staff escreve modelos" on public.modelos for all using (public.is_staff(auth.uid()));
create policy "staff escreve versoes" on public.versoes for all using (public.is_staff(auth.uid()));

-- veiculos ------------------------------------------------------------
-- SELECT direto na tabela é só para admin, porque a tabela carrega
-- preco_custo, placa e chassi. Vendedor lê pela view veiculos_vendedor.
create policy "admin le veiculos" on public.veiculos
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "staff cadastra veiculo" on public.veiculos
  for insert with check (public.is_staff(auth.uid()));
create policy "staff edita veiculo" on public.veiculos
  for update using (public.is_staff(auth.uid()));
create policy "admin exclui veiculo" on public.veiculos
  for delete using (public.has_role(auth.uid(), 'admin'));

-- fotos e opcionais ---------------------------------------------------
create policy "fotos publicas" on public.veiculo_fotos for select using (true);
create policy "staff gerencia fotos" on public.veiculo_fotos
  for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy "opcionais publicos" on public.opcionais for select using (true);
create policy "admin gerencia opcionais" on public.opcionais
  for all using (public.has_role(auth.uid(), 'admin'));

create policy "vinculo opcional publico" on public.veiculo_opcionais for select using (true);
create policy "staff gerencia vinculo" on public.veiculo_opcionais
  for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- leads ---------------------------------------------------------------
-- Visitante NÃO escreve direto: o formulário passa pela edge function
-- registrar-lead, que valida, aplica anti-spam e dispara a notificação.
create policy "admin le todos os leads" on public.leads
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "vendedor le seus leads" on public.leads
  for select using (public.has_role(auth.uid(), 'vendedor') and vendedor_id = auth.uid());
create policy "staff atualiza lead" on public.leads
  for update using (
    public.has_role(auth.uid(), 'admin')
    or (public.has_role(auth.uid(), 'vendedor') and vendedor_id = auth.uid())
  );
create policy "admin exclui lead" on public.leads
  for delete using (public.has_role(auth.uid(), 'admin'));

create policy "staff le interacoes" on public.lead_interacoes
  for select using (
    public.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.leads l where l.id = lead_id and l.vendedor_id = auth.uid())
  );
create policy "staff registra interacao" on public.lead_interacoes
  for insert with check (public.is_staff(auth.uid()));

-- visualizacoes e auditoria -------------------------------------------
create policy "staff le visualizacoes" on public.visualizacoes
  for select using (public.is_staff(auth.uid()));
create policy "admin le auditoria" on public.auditoria
  for select using (public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- Views de leitura
-- =====================================================================

-- Pública: sem preco_custo, sem placa, sem chassi, só o que está no ar.
create view public.veiculos_publicos
with (security_invoker = off) as
select
  v.id, v.slug, v.codigo_interno,
  ma.nome as marca, mo.nome as modelo, ve.nome as versao,
  ma.id as marca_id, mo.id as modelo_id, v.versao_id,
  v.ano_fabricacao, v.ano_modelo, v.km, v.cambio, v.combustivel,
  v.cor, v.cor_interna, v.carroceria, v.portas, v.motor, v.potencia_cv,
  v.blindado, v.pcd,
  v.preco, v.preco_promocional, v.preco_sob_consulta,
  v.aceita_troca, v.aceita_financiamento, v.entrada_minima,
  v.valor_fipe,
  v.unico_dono, v.ipva_pago, v.licenciado, v.laudo_cautelar, v.manual_chave,
  v.garantia_fabrica, v.descricao, v.video_url,
  v.status, v.destaque, v.ordem, v.entrada_estoque,
  v.meta_title, v.meta_description, v.created_at,
  case
    when v.preco_promocional is not null
     and (v.promo_inicio is null or v.promo_inicio <= current_date)
     and (v.promo_fim    is null or v.promo_fim    >= current_date)
    then v.preco_promocional else v.preco
  end as preco_vigente,
  (select f.url from public.veiculo_fotos f
    where f.veiculo_id = v.id order by f.capa desc, f.ordem asc limit 1) as foto_capa
from public.veiculos v
left join public.versoes ve on ve.id = v.versao_id
left join public.modelos mo on mo.id = ve.modelo_id
left join public.marcas  ma on ma.id = mo.marca_id
where v.deleted_at is null
  and v.status in ('disponivel', 'reservado', 'vendido');

grant select on public.veiculos_publicos to anon, authenticated;

-- Gestão. O corte admin/vendedor não pode sair de GRANT: os dois logam
-- como o mesmo papel Postgres (authenticated). Quem separa é o filtro
-- dentro da própria view — para um vendedor, veiculos_admin volta vazia.
create view public.veiculos_admin
with (security_invoker = off) as
select
  v.*,
  v.preco - coalesce(v.preco_custo, 0) as margem,
  current_date - v.entrada_estoque     as dias_parado,
  ma.nome as marca, mo.nome as modelo, ve.nome as versao
from public.veiculos v
left join public.versoes ve on ve.id = v.versao_id
left join public.modelos mo on mo.id = ve.modelo_id
left join public.marcas  ma on ma.id = mo.marca_id
where v.deleted_at is null
  and public.has_role(auth.uid(), 'admin');

-- Mesma listagem, sem preco_custo, placa, chassi e margem.
create view public.veiculos_vendedor
with (security_invoker = off) as
select
  v.id, v.slug, v.codigo_interno, v.versao_id,
  ma.nome as marca, mo.nome as modelo, ve.nome as versao,
  v.ano_fabricacao, v.ano_modelo, v.km, v.cambio, v.combustivel, v.cor,
  v.carroceria, v.portas, v.preco, v.preco_promocional, v.preco_sob_consulta,
  v.status, v.destaque, v.ordem, v.entrada_estoque,
  current_date - v.entrada_estoque as dias_parado,
  v.created_at, v.updated_at
from public.veiculos v
left join public.versoes ve on ve.id = v.versao_id
left join public.modelos mo on mo.id = ve.modelo_id
left join public.marcas  ma on ma.id = mo.marca_id
where v.deleted_at is null
  and public.is_staff(auth.uid());

revoke all on public.veiculos_admin    from anon;
revoke all on public.veiculos_vendedor from anon;
grant select on public.veiculos_admin    to authenticated;
grant select on public.veiculos_vendedor to authenticated;

-- =====================================================================
-- Storage
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('veiculos', 'veiculos', true)
on conflict (id) do nothing;

create policy "fotos de veiculo sao publicas" on storage.objects
  for select using (bucket_id = 'veiculos');
create policy "staff envia foto" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'veiculos' and public.is_staff(auth.uid()));
create policy "staff atualiza foto" on storage.objects
  for update to authenticated using (bucket_id = 'veiculos' and public.is_staff(auth.uid()));
create policy "staff remove foto" on storage.objects
  for delete to authenticated using (bucket_id = 'veiculos' and public.is_staff(auth.uid()));
