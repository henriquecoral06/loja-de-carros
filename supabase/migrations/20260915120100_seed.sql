-- =====================================================================
-- Seed do template.
-- Quem remixa o projeto abre num sistema que já funciona, e troca estes
-- dados pelos da própria loja. Dois veículos de exemplo, marcados como
-- tal no código interno para ficarem fáceis de achar e apagar.
-- =====================================================================

insert into public.config (id, nome, telefone, whatsapp, email, endereco, cidade, uf,
                           texto_home, texto_sobre, horarios, redes_sociais,
                           meta_title, meta_description)
values (
  true,
  'Revenda Exemplo',
  '(11) 3000-0000',
  '5511999999999',
  'contato@revendaexemplo.com.br',
  'Av. das Nações, 1000',
  'São Paulo', 'SP',
  'Seminovos revisados, com procedência e garantia. Leve o seu hoje.',
  'Somos uma revenda familiar que trabalha há mais de 20 anos com carros de procedência.',
  '[{"dia":"Segunda a sexta","abre":"08:30","fecha":"18:30"},
    {"dia":"Sábado","abre":"09:00","fecha":"14:00"},
    {"dia":"Domingo","fechado":true}]'::jsonb,
  '{"instagram":"","facebook":""}'::jsonb,
  'Revenda Exemplo — seminovos com procedência',
  'Confira nosso estoque de seminovos revisados. Aceitamos troca e financiamos.'
) on conflict (id) do nothing;

insert into public.opcionais (nome, categoria, ordem) values
  ('Ar-condicionado','Conforto',1), ('Direção elétrica','Conforto',2),
  ('Vidros elétricos','Conforto',3), ('Travas elétricas','Conforto',4),
  ('Banco de couro','Conforto',5), ('Piloto automático','Conforto',6),
  ('Central multimídia','Tecnologia',7), ('Câmera de ré','Tecnologia',8),
  ('Sensor de estacionamento','Tecnologia',9), ('Apple CarPlay / Android Auto','Tecnologia',10),
  ('Faróis de LED','Tecnologia',11), ('Airbag duplo','Segurança',12),
  ('Freios ABS','Segurança',13), ('Controle de estabilidade','Segurança',14),
  ('Isofix','Segurança',15), ('Rodas de liga leve','Externo',16),
  ('Teto solar','Externo',17), ('Engate','Externo',18)
on conflict (nome) do nothing;

-- Amostra da base FIPE. A carga completa é feita pela rotina mensal.
insert into public.marcas (nome) values
  ('Toyota'), ('Honda'), ('Volkswagen'), ('Chevrolet'), ('Hyundai')
on conflict (nome) do nothing;

insert into public.modelos (marca_id, nome)
select ma.id, x.modelo
from public.marcas ma
join (values
  ('Toyota','Corolla'), ('Toyota','Hilux'), ('Toyota','Yaris'),
  ('Honda','Civic'), ('Honda','HR-V'), ('Honda','Fit'),
  ('Volkswagen','Polo'), ('Volkswagen','T-Cross'), ('Volkswagen','Nivus'),
  ('Chevrolet','Onix'), ('Chevrolet','Tracker'),
  ('Hyundai','HB20'), ('Hyundai','Creta')
) as x(marca, modelo) on x.marca = ma.nome
on conflict (marca_id, nome) do nothing;

insert into public.versoes (modelo_id, nome, combustivel)
select mo.id, x.versao, x.comb
from public.modelos mo
join public.marcas ma on ma.id = mo.marca_id
join (values
  ('Toyota','Corolla','XEI 2.0 16V Flex Aut.','Flex'),
  ('Toyota','Corolla','GLI 1.8 16V Flex Aut.','Flex'),
  ('Toyota','Corolla','Altis Premium Hybrid 1.8','Híbrido'),
  ('Honda','Civic','EXL 2.0 Flex CVT','Flex'),
  ('Honda','HR-V','EX 1.8 Flex CVT','Flex'),
  ('Volkswagen','T-Cross','Comfortline 200 TSI Aut.','Flex'),
  ('Volkswagen','Polo','Highline 200 TSI Aut.','Flex'),
  ('Chevrolet','Onix','LTZ 1.0 Turbo Aut.','Flex'),
  ('Hyundai','HB20','Vision 1.0 Flex','Flex'),
  ('Hyundai','Creta','Action 1.6 Aut.','Flex')
) as x(marca, modelo, versao, comb) on x.marca = ma.nome and x.modelo = mo.nome
on conflict (modelo_id, nome) do nothing;

-- Dois veículos de demonstração.
insert into public.veiculos (
  versao_id, codigo_interno, slug, ano_fabricacao, ano_modelo, km, cambio,
  combustivel, cor, carroceria, portas, motor, potencia_cv, preco, preco_custo,
  valor_fipe, unico_dono, ipva_pago, licenciado, laudo_cautelar, descricao,
  status, destaque, ordem, entrada_estoque, origem_cadastro
)
select ve.id, 'DEMO-001', 'toyota-corolla-xei-2-0-16v-flex-aut-2021',
       2020, 2021, 48500, 'Automático', 'Flex', 'Prata', 'Sedã', 4, '2.0 16V', 177,
       124900.00, 112000.00, 129300.00, true, true, true, true,
       'Corolla XEi 2021 em estado de novo, revisado na concessionária, com manual e chave reserva. Aceita troca.',
       'disponivel', true, 1, current_date - 18, 'fipe'
from public.versoes ve
join public.modelos mo on mo.id = ve.modelo_id
join public.marcas  ma on ma.id = mo.marca_id
where ma.nome = 'Toyota' and mo.nome = 'Corolla' and ve.nome = 'XEI 2.0 16V Flex Aut.'
on conflict (slug) do nothing;

insert into public.veiculos (
  versao_id, codigo_interno, slug, ano_fabricacao, ano_modelo, km, cambio,
  combustivel, cor, carroceria, portas, motor, potencia_cv, preco, preco_promocional,
  preco_custo, valor_fipe, unico_dono, ipva_pago, licenciado, descricao,
  status, destaque, ordem, entrada_estoque, origem_cadastro
)
select ve.id, 'DEMO-002', 'volkswagen-t-cross-comfortline-200-tsi-aut-2022',
       2022, 2022, 31200, 'Automático', 'Flex', 'Branco', 'SUV', 4, '1.0 TSI', 128,
       118900.00, 114900.00, 104000.00, 121500.00, false, true, true,
       'T-Cross Comfortline 2022, único dono anterior, multimídia com CarPlay e sensores de ré.',
       'disponivel', true, 2, current_date - 41, 'fipe'
from public.versoes ve
join public.modelos mo on mo.id = ve.modelo_id
join public.marcas  ma on ma.id = mo.marca_id
where ma.nome = 'Volkswagen' and mo.nome = 'T-Cross' and ve.nome = 'Comfortline 200 TSI Aut.'
on conflict (slug) do nothing;

insert into public.veiculo_opcionais (veiculo_id, opcional_id)
select v.id, o.id
from public.veiculos v
cross join public.opcionais o
where v.codigo_interno in ('DEMO-001','DEMO-002')
  and o.nome in ('Ar-condicionado','Direção elétrica','Vidros elétricos','Central multimídia',
                 'Câmera de ré','Airbag duplo','Freios ABS','Rodas de liga leve')
on conflict do nothing;
