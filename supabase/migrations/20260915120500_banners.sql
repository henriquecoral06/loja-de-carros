-- =====================================================================
-- Banners da home e arquivos de marca.
--
-- A abertura do site passa a ser um carrossel de imagens, sem texto por
-- cima. O logo deixa de ser uma URL digitada e passa a ser upload.
-- Ambos vivem no bucket 'marca'.
--
-- Isto existe porque o projeto é remixado por muitos lojistas: quem
-- remixa precisa trocar logo e banner pelo painel, sem tocar em código
-- e sem hospedar imagem em outro lugar.
-- =====================================================================

create table public.banners (
  id         uuid primary key default gen_random_uuid(),
  url        text not null,
  -- Sem texto na imagem, o alt é a única descrição que o leitor de tela
  -- e o buscador recebem. Por isso é campo do cadastro, não opcional
  -- esquecido no código.
  alt        text not null default '',
  link       text,
  ordem      integer not null default 0,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

create index banners_ordem_idx on public.banners (ativo, ordem);

alter table public.banners enable row level security;

create policy "banners publicos" on public.banners
  for select using (ativo = true or public.is_staff(auth.uid()));
create policy "staff gerencia banners" on public.banners
  for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

grant select on public.banners to anon, authenticated;
grant select, insert, update, delete on public.banners to authenticated;
grant all on public.banners to service_role;

-- ---------------------------------------------------------------------
-- Bucket de marca: logo, favicon e banners.
-- Separado do bucket de veículos porque o ciclo de vida é outro — um
-- veículo sai do estoque, a marca fica.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('marca', 'marca', true)
on conflict (id) do nothing;

create policy "arquivos de marca sao publicos" on storage.objects
  for select using (bucket_id = 'marca');
create policy "staff envia arquivo de marca" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'marca' and public.is_staff(auth.uid()));
create policy "staff atualiza arquivo de marca" on storage.objects
  for update to authenticated using (bucket_id = 'marca' and public.is_staff(auth.uid()));
create policy "staff remove arquivo de marca" on storage.objects
  for delete to authenticated using (bucket_id = 'marca' and public.is_staff(auth.uid()));
