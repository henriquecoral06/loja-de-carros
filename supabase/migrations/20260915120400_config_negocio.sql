-- =====================================================================
-- Posicionamento do negócio.
--
-- Estes campos não são enfeite de cadastro: são a matéria-prima do
-- gerador de prompt do banner. Sem eles o prompt sai genérico e o
-- banner podia ser de qualquer revenda do país.
-- =====================================================================

alter table public.config
  add column if not exists o_que_vende      text,
  add column if not exists para_quem        text,
  add column if not exists diferenciais     text,   -- um por linha
  add column if not exists oferta_principal text,
  add column if not exists provas_numeros   text,   -- um por linha
  add column if not exists regiao           text,
  add column if not exists tom_de_voz       text not null default 'proximo',
  -- Último prompt gerado, para o lojista voltar nele sem refazer.
  add column if not exists banner_prompt    text,
  add column if not exists banner_briefing  jsonb not null default '{}'::jsonb;

comment on column public.config.diferenciais is
  'Um diferencial por linha. Alimenta o prompt do banner e a página Sobre.';
comment on column public.config.tom_de_voz is
  'Chave do tom: proximo | profissional | premium | jovem | familiar.';

-- Preenche o exemplo para o template abrir num estado útil.
update public.config set
  o_que_vende      = coalesce(o_que_vende, 'Seminovos e usados revisados, com procedência e garantia'),
  para_quem        = coalesce(para_quem, 'Famílias e profissionais que querem trocar de carro sem dor de cabeça'),
  diferenciais     = coalesce(diferenciais, E'Todo carro com laudo cautelar aprovado\nRevisão completa antes da venda\nAceitamos seu usado na troca\nFinanciamento aprovado na hora'),
  oferta_principal = coalesce(oferta_principal, 'Entrada a partir de 20% e parcelas em até 60x'),
  provas_numeros   = coalesce(provas_numeros, E'Mais de 20 anos no mercado\nNota 4,8 no Google\n1.200 carros entregues'),
  regiao           = coalesce(regiao, 'São Paulo e região metropolitana'),
  tom_de_voz       = coalesce(nullif(tom_de_voz, ''), 'proximo')
where id = true;
