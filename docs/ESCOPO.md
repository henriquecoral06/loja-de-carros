# Escopo — Plataforma para Revenda de Veículos

> Versão 5 · template remixável no Lovable (Vite + React + Supabase), dois papéis de usuário, cadastro por FIPE ou digitação, WhatsApp pela Evolution API, feed de portais na fase 3.

> **Legenda:** itens sem marcação já estavam no escopo original. Itens marcados com **`(+)`** são acréscimos sugeridos.
> **Fases:** `[F1]` MVP · `[F2]` evolução · `[F3]` diferencial competitivo.

---

## 0. Decisões fechadas

| # | Decisão | Definição | Impacto no projeto |
|---|---------|-----------|--------------------|
| 1 | Modelo de produto | **Template remixável, não SaaS.** Cada revenda roda a própria instância | Sem multi-tenant, sem cobrança, sem domínio por cliente — mas exige seed, migrações limpas e zero dado fixo no código. Ver 0.1 |
| 2 | Usuários do painel | **Multiusuário com dois papéis: administrador e vendedor** | Exige matriz de permissões (seção 2), log de auditoria por usuário e ocultação do preço de custo. |
| 3 | Portais | **Feed XML na fase 3** | A fase 1 já precisa gravar os dados no formato que o feed vai exigir. |
| 4 | Origem do cadastro | **Tabela FIPE e digitação manual** | Consulta por placa removida: depende de API paga por requisição. Ver 4.0. |
| 5 | Volume esperado | **Em aberto** | Define hospedagem, storage de imagens e CDN. Assumido: até 150 veículos e 30 fotos por veículo. |
| 6 | Plataforma | **Lovable: Vite + React + TypeScript + Tailwind + shadcn/ui + Supabase** | Define toda a arquitetura. Conflita com o requisito de SSR — ver 0.2 |
| 7 | WhatsApp | **Evolution API (não oficial), auto-hospedada** | Devolve a notificação automática de lead sem custo por mensagem, com risco de bloqueio do número |

### 0.1 Template remixável não é SaaS **(+)**

A decisão mudou de escala: o projeto continua sendo instância única por revenda, mas agora vários lojistas vão **remixar** o mesmo código. São coisas diferentes, e a distinção define o trabalho.

**O que continua valendo:** nada de multi-inquilino. Cada revenda tem seu próprio projeto Supabase, com banco, storage e usuários separados. Não existe `revenda_id` em tabela nenhuma.

**O que passa a ser obrigatório por causa do remix:**

- Nenhum dado da loja no código. Nome, cores, contatos e textos vivem na tabela `config` e são lidos em runtime.
- Migrações que rodam limpas num Supabase vazio, com seed que abre o sistema já funcionando.
- Primeiro usuário criado vira admin automaticamente — senão o remixador trava na porta.
- RLS correta desde a primeira versão. **É o ponto mais sensível de todos:** a anon key vai embutida no bundle de cada remix, e um erro de policy é multiplicado por todos que remixarem.
- README com o passo a passo do remix e a lista de secrets.

### 0.2 O conflito entre Lovable e SEO **(+)**

O stack do Lovable é uma SPA renderizada no cliente. O escopo exige renderização no servidor (seção 11) por dois motivos, e eles têm gravidade diferente:

- **Google:** o Googlebot executa JavaScript. Indexa uma SPA, com atraso e alguma perda. É contornável.
- **Prévia de link no WhatsApp:** o robô que monta o card **não executa JavaScript**. Sem tratamento, colar o link de um carro no WhatsApp mostra um card vazio — exatamente o recurso de maior retorno da seção 7, no canal onde a venda acontece.

**Solução adotada, dentro do stack:** uma edge function (`seo`) que devolve HTML com Open Graph e schema.org já preenchidos, e o proxy do domínio roteia para ela apenas as requisições de robôs. Visitante humano continua recebendo o SPA. Sitemap e robots.txt saem da mesma função.

Isso resolve o problema sem trocar o Lovable por Next.js — e sem fingir que o problema não existe.

### Consequência de não virar SaaS

**Não construa a abstração multi-inquilino.** O erro clássico aqui é deixar tudo "preparado para o futuro": coluna `revenda_id` em toda tabela, resolução de tenant por subdomínio, configuração em banco onde bastava arquivo. Isso custa semanas, complica toda consulta e nunca é usado. A camada de personalização (seção 10) resolve o mesmo problema com um registro de configuração único.

Se um dia virar produto, o custo de extrair o multi-tenant de um sistema simples e funcionando é menor do que o custo de carregar a abstração errada por dois anos.

### Consequência da decisão 3

O feed XML dos portais exige marca, modelo, versão e opcionais **normalizados**, e fotos em URL pública estável. Se a fase 1 gravar esses campos como texto livre, a fase 3 vira remodelagem de banco com migração de dados. Como a decisão 4 já traz a FIPE, isso está resolvido — desde que os opcionais também sejam lista marcável, e não descrição solta.

### Pendência restante

Falta apenas o volume: **quantos veículos a revenda mantém em estoque e quantas fotos por veículo**. É o que dimensiona o plano de hospedagem, o storage e o custo mensal de CDN. Até 150 veículos cabem em infraestrutura pequena; acima de 500, com 30 fotos cada, o storage e o processamento de imagem passam a ser linha de custo relevante.

---


## 1. Objetivo e métricas de sucesso

O site não é uma vitrine — é uma máquina de gerar conversas no WhatsApp. Todo o escopo deve ser lido com isso em mente.

**(+)** Métricas de aceite do projeto (medidas 30 dias após o go-live):
- Taxa de conversão visitante → lead (meta de referência: 3% a 6%)
- Tempo de primeira resposta ao lead (meta: < 15 minutos em horário comercial)
- Core Web Vitals aprovados em mobile (LCP < 2,5s)
- 100% do estoque indexado no Google Search Console

---

## 2. Perfis de usuário e permissões **(+)**

Decisão 2 fechada: dois papéis.

| Perfil | Acesso | Principais ações |
|--------|--------|------------------|
| Visitante | Público | Buscar, comparar, ver veículo, chamar no WhatsApp |
| Vendedor | Painel restrito | Cadastrar e editar veículos, atender os leads atribuídos a ele |
| Administrador | Painel completo | Tudo, mais preço de custo, dashboard, personalização e usuários |

### 2.1 Matriz de permissões **(+)**

| Ação | Vendedor | Administrador |
|------|----------|---------------|
| Cadastrar e editar veículo | Sim | Sim |
| Excluir veículo | Não — apenas ocultar | Sim |
| Ver preço de custo e margem | **Não** | Sim |
| Alterar preço de venda | Sim, com registro no histórico | Sim |
| Ver leads | Apenas os atribuídos a ele | Todos |
| Reatribuir lead a outro vendedor | Não | Sim |
| Dashboard de estoque | Sim | Sim |
| Dashboard financeiro e por vendedor | Não | Sim |
| Personalização da revenda | Não | Sim |
| Gerenciar usuários | Não | Sim |
| Importar e exportar dados | Não | Sim |
| Ver log de auditoria | Não | Sim |

Regras de apoio:
- O vendedor não pode alterar o próprio papel nem criar usuários.
- Toda ação sensível — mudança de preço, de status e exclusão — grava autor, data e valores anterior e novo.
- Sessão expira por inatividade; senha com política mínima e recuperação por e-mail.
- O preço de custo é bloqueado **na API**, não apenas escondido na tela. Esconder no front-end e devolver o campo no JSON é vazamento de dado sensível.

---

## 3. Site público

- Home
- Estoque de veículos (listagem com paginação)
- Página individual do veículo
- Sobre a revenda
- Contato
- WhatsApp (botão flutuante + links por veículo)
- Responsividade (mobile-first — 70% a 85% do tráfego de revenda é celular)
- **(+)** `[F1]` Página 404 e página de resultado vazio, ambas com veículos sugeridos
- **(+)** `[F1]` Política de Privacidade e Termos de Uso (exigência LGPD)
- **(+)** `[F1]` Banner de consentimento de cookies — obrigatório para disparar GA/Pixel legalmente
- **(+)** `[F1]` Breadcrumbs em todas as páginas internas
- **(+)** `[F2]` Página "Venda seu carro" / avaliação de troca (é um gerador de leads independente do estoque)
- **(+)** `[F2]` Página de financiamento com simulador de parcelas
- **(+)** `[F2]` Comparador de veículos (até 3 lado a lado) e lista de favoritos
- **(+)** `[F3]` Blog / conteúdo para SEO orgânico

---

## 4. Cadastro de veículos

### 4.0 Origem dos dados do veículo **(+)** — decisão 4

Dois caminhos, ambos desembocando no mesmo registro canônico.

**1. Tabela FIPE** `[F1]` — caminho padrão
Seleção em cascata: marca → modelo → ano → versão, sempre a partir da base FIPE.
- Base sincronizada por rotina mensal e armazenada localmente. Não consultar serviço externo a cada cadastro: fica lento e quebra quando o serviço cai.
- Grava `codigo_fipe`, `valor_fipe` e a data da consulta no veículo.
- Esse valor abre dois usos diretos: mostrar no site o quanto o carro está **abaixo da tabela**, que é argumento de conversão, e calcular margem real no painel.
- A tabela FIPE é pública e existem fontes gratuitas. Como a sincronização é mensal e o dado fica local, eventual limite de requisição da fonte não afeta a operação. Se nenhuma fonte gratuita se mostrar estável, o plano B é importar a tabela por CSV uma vez por mês — trabalho manual de minutos, sem custo.

**2. Digitação manual** `[F1]` — exceção
Sempre disponível, para o que a FIPE não cobre: importado, veículo modificado, modelo recém-lançado.
- Cadastro manual entra como **variação pendente de revisão**, sinalizada para o administrador.
- Sem essa marcação, o texto livre volta a contaminar a base e os filtros degradam — que é exatamente o problema que a decisão 4 existe para evitar.

**Regra única:** independentemente do caminho, o veículo sempre aponta para um registro de versão na base. É isso que sustenta os filtros da seção 6, os veículos semelhantes da seção 7 e o feed XML da seção 11.

**Removido do escopo:** preenchimento automático por consulta de placa. Depende de API de terceiros cobrada por requisição, o que criaria custo mensal recorrente. Registrado aqui para que a decisão não seja reaberta por engano — e porque, se um dia a revenda quiser contratar, o encaixe é só um terceiro caminho alimentando o mesmo registro de versão.

### 4.1 Identificação
- Marca · Modelo · Versão · Ano
- **(+)** Ano de fabricação **e** ano do modelo (campos distintos — o mercado exige)
- **(+)** Tipo: 0km / seminovo / usado
- **(+)** Código interno (para o vendedor achar o carro no pátio)
- **(+)** Placa e chassi — **uso interno, nunca exibidos no site**
- **(+)** Código FIPE (preenchido pela integração)

### 4.2 Ficha técnica
- Quilometragem · Câmbio · Combustível · Cor · Carroceria · Portas
- **(+)** Motorização / cilindrada · Potência (cv)
- **(+)** Cor interna · Final da placa
- **(+)** Blindado (sim/não) · Adaptado PCD (sim/não)

### 4.3 Comercial
- Preço
- **(+)** Preço promocional ("de / por") com data de início e fim
- **(+)** Opção "Preço sob consulta" (esconde o valor e força o contato)
- **(+)** Preço de custo e margem — **visível só para administrador**
- **(+)** Aceita troca · Aceita financiamento · Entrada mínima
- **(+)** Data de entrada no estoque (base para o indicador "dias parado")

### 4.4 Procedência e documentação **(+)**
- Único dono · IPVA pago · Licenciado · Garantia de fábrica (até quando)
- Laudo cautelar aprovado · Manual e chave reserva
- Revisões em concessionária

### 4.5 Conteúdo
- Descrição · Opcionais (lista marcável, não texto livre) · Fotos
- **(+)** Upload múltiplo com reordenação por arrastar, definição de foto de capa
- **(+)** Compressão e redimensionamento automáticos no upload + marca d'água opcional
- **(+)** Vídeo (link do YouTube) `[F2]`
- **(+)** Limite e formatos definidos por contrato (ex.: 30 fotos, JPG/PNG/WebP, 10 MB cada)

### 4.6 Publicação
- Status: disponível · reservado · vendido · oculto
- **(+)** Status adicional: **rascunho** (cadastro incompleto, não publica)
- **(+)** Regra explícita: o que acontece com veículo *vendido* — sai do site, ou fica visível com selo "Vendido" (recomendado: fica 30 dias com selo, alimenta SEO e prova social, depois arquiva com redirecionamento 301)

---

## 5. Gestão do estoque

- Listagem dos veículos · Editar · Excluir · Alterar status · Ordenar · Destaques · Controle das fotos
- **(+)** Exclusão lógica (soft delete) com lixeira de 30 dias — evitar perda acidental de histórico e leads vinculados
- **(+)** Busca e filtros dentro do painel (o admin sofre o mesmo problema do site)
- **(+)** Ações em massa: alterar status, aplicar desconto, destacar
- **(+)** Duplicar veículo (acelera cadastro de carros parecidos)
- **(+)** Indicador de "dias parado" com alerta acima de X dias `[F2]`
- **(+)** Histórico de alterações de preço por veículo `[F2]`
- **(+)** Importação e exportação em lote via CSV/XML (migração do estoque atual) `[F2]`
- **(+)** Log de auditoria: quem alterou o quê e quando `[F2]`

---

## 6. Busca e filtros

- Marca · Modelo · Preço · Ano · Quilometragem · Câmbio · Combustível · Carroceria · Cor · Ordenação
- **(+)** Campo de busca livre ("corolla 2020 automático")
- **(+)** Filtros dependentes: escolher a marca recarrega só os modelos existentes **no estoque**
- **(+)** Contador de resultados por opção e botão "limpar filtros"
- **(+)** Filtros refletidos na URL — link compartilhável pelo vendedor e indexável pelo Google
- **(+)** Faixas por slider para preço, ano e km
- **(+)** Filtro por parcela ("até R$ 1.500/mês") — é assim que o comprador pensa `[F2]`
- **(+)** Alerta de busca: "avise-me quando entrar um carro assim" (captura lead sem estoque) `[F3]`
- **(+)** Índices de banco definidos para os campos filtráveis (requisito não funcional)

---

## 7. Página do veículo

- Galeria de fotos · Informações · Preço · Descrição · Opcionais · Veículos semelhantes
- Botão de WhatsApp · Botão de interesse · Compartilhamento
- **(+)** Galeria com zoom/lightbox e swipe no mobile
- **(+)** Mensagem do WhatsApp pré-preenchida com modelo, ano e código do veículo
- **(+)** Selos visuais: Reservado, Vendido, Único dono, IPVA pago, Blindado
- **(+)** Simulação de parcela ("a partir de R$ X/mês") ao lado do preço `[F2]`
- **(+)** "Avise-me se o preço baixar" (segundo tipo de lead) `[F2]`
- **(+)** Contador de visualizações (alimenta o dashboard da seção 9)
- **(+)** Open Graph dinâmico — ao colar o link no WhatsApp aparece foto, modelo e preço. **Alto impacto, custo baixo.**
- **(+)** Dados estruturados schema.org `Vehicle` + `Offer` (ficha aparece direto no Google)

---

## 8. Gestão de leads

### 8.1 Dados capturados
- Nome · WhatsApp · E-mail · Veículo de interesse · Data/hora · Origem · Observações · Status
- **(+)** Captura automática de UTM (source, medium, campaign) + página de origem
- **(+)** Tipo de lead: WhatsApp · formulário · avaliação de troca · alerta de preço · simulação
- **(+)** Vendedor responsável

### 8.2 Pipeline
`Novo → Em atendimento → Proposta → Negociação → Vendido / Perdido`
- **(+)** Motivo da perda em lista fechada (preço, comprou em outro lugar, crédito negado, sumiu) — é o dado que gera aprendizado
- **(+)** Histórico de interações com data e autor
- **(+)** Tarefa de follow-up com data e lembrete `[F2]`
- **(+)** Visualização em kanban além da lista `[F2]`

### 8.3 Operação
- **(+)** Notificação imediata do lead novo **por WhatsApp, via Evolution API auto-hospedada** — sem custo por mensagem
- **(+)** E-mail transacional como canal de reserva, disparado sempre. A Evolution opera fora dos termos da Meta: o número pode ser bloqueado e a integração quebra quando o protocolo muda. **Nenhuma falha de notificação pode derrubar o registro do lead**
- **(+)** Resposta ao lead pelo WhatsApp direto do painel, com a interação gravada no histórico mesmo quando o envio falha
- **(+)** Chip dedicado para a instância da Evolution, nunca o número principal da loja
- **(+)** Proteção anti-spam (honeypot + rate limit; reCAPTCHA se necessário)
- **(+)** Deduplicação por telefone (mesma pessoa consultando 3 carros = 1 lead com 3 interesses)
- **(+)** Exportação em CSV
- **(+)** Consentimento LGPD registrado no ato do envio (checkbox + data + IP) e rotina de exclusão sob pedido
- **(+)** Webhook de saída para CRM/automação `[F3]`

---

## 9. Dashboard

- Veículos disponíveis · Reservados · Vendidos · Leads recebidos · Leads por período · Veículos com mais interesse
- **(+)** Filtro de período com comparativo contra o período anterior
- **(+)** Taxa de conversão do funil (visitas → leads → propostas → vendas)
- **(+)** Tempo médio de primeira resposta ao lead
- **(+)** Giro de estoque: tempo médio até a venda e ranking dos veículos parados há mais tempo
- **(+)** Origem dos leads (orgânico, pago, direto, redes)
- **(+)** Desempenho por vendedor `[F2]`
- **(+)** Veículos com muitas visitas e poucos leads — sinal de preço ou fotos ruins

---

## 10. Personalização da revenda

- Logo · Favicon · Cores · Banner · Nome · Telefone · WhatsApp · E-mail · Endereço · Redes sociais · Horários
- **(+)** Razão social, CNPJ e endereço completo no rodapé (exigência legal)
- **(+)** Múltiplos banners com link, ordem e agendamento de exibição
- **(+)** Textos editáveis da home e da página "Sobre" (sem depender do desenvolvedor)
- **(+)** Coordenadas para o mapa no Contato, via incorporação gratuita (iframe do Google Maps ou OpenStreetMap). A API JavaScript do Google Maps exige conta com cobrança e fica fora
- **(+)** Múltiplas lojas/filiais, com filtro de estoque por loja `[F3]`
- **(+)** Pré-visualização das cores antes de salvar

---

## 11. SEO e integrações

- URLs amigáveis · Meta title/description · Sitemap · Google Analytics · GTM · Meta Pixel · Compartilhamento
- **(+)** URL do veículo no padrão `/carros/toyota-corolla-xei-2.0-2021` (marca-modelo-versão-ano)
- **(+)** Renderização no servidor (SSR/SSG) — sem isso, Google e prévia do WhatsApp não enxergam o conteúdo
- **(+)** `robots.txt`, canonical e sitemap dinâmico com imagens
- **(+)** Meta tags editáveis por veículo e por página
- **(+)** Redirecionamento 301 para veículos arquivados (preserva o SEO conquistado)
- **(+)** Tags disparadas **somente após o consentimento de cookies**
- **(+)** Google Search Console e Google Business Profile configurados na entrega
- **(+)** Catálogo do Facebook/Instagram por feed (permite anúncio dinâmico de estoque) `[F2]`
- **(+)** Feed XML para portais: Webmotors, OLX, iCarros, Mercado Livre `[F3]`. Os campos que o feed exige já nascem normalizados na fase 1 — ver 4.0

---

## 12. Seções ausentes no escopo original **(+)**

### 12.1 Usuários e autenticação `[F1]`
Login, recuperação de senha, papéis (admin/vendedor), bloqueio após tentativas falhas, sessão com expiração. Vendedor não vê preço de custo nem o dashboard financeiro.

### 12.2 LGPD e jurídico `[F1]`
Base legal do tratamento, política de privacidade, consentimento no formulário, canal para exclusão de dados, retenção definida para leads, contrato de tratamento com o cliente.

### 12.3 Infraestrutura e operação `[F1]`
Ambientes (produção e homologação), domínio e SSL, hospedagem, CDN para imagens, **backup diário automatizado com teste de restauração**, monitoramento de erros e de disponibilidade.

**Serviços externos e custo recorrente** — o projeto foi fechado sem nenhuma API paga:

| Serviço | Situação |
|---------|----------|
| Tabela FIPE | Fonte gratuita, sincronizada mensalmente para base local |
| E-mail transacional | Plano gratuito atende o volume de uma revenda |
| Push no navegador | Gratuito |
| Contato via WhatsApp | Link `wa.me`, gratuito |
| Notificação por WhatsApp | Evolution API auto-hospedada: sem custo por mensagem, custo do servidor onde roda |
| Mapa no Contato | Incorporação gratuita |
| Anti-spam | Honeypot e limite de envios, sem serviço externo |
| Analytics, Tag Manager, Pixel | Gratuitos |
| Feed XML para portais `[F3]` | Gerado pelo próprio sistema; o custo é o anúncio no portal, pago direto por eles |
| **Hospedagem, domínio e storage** | **Único custo mensal fixo do projeto** |

Fora do escopo por gerarem cobrança por uso: consulta de placa, API oficial do WhatsApp, API JavaScript do Google Maps e serviços de enriquecimento de dados.

**Arquitetura:** Vite + React + TypeScript + Tailwind + shadcn/ui no front, Supabase (Postgres, Auth, Storage, Edge Functions) no back — o stack que o Lovable gera e entende, para o projeto seguir editável lá e remixável por outros lojistas.

### 12.4 Performance e acessibilidade `[F1]`
Imagens em WebP com lazy loading, meta de LCP < 2,5s no 4G, contraste e navegação por teclado no site público.

### 12.5 Qualidade `[F1]`
Testes automatizados dos fluxos críticos (busca, envio de lead, cadastro), validação em iOS Safari e Android Chrome.

### 12.6 Entrega e handoff `[F1]`
Treinamento gravado do painel (1h), manual em PDF, 30 dias de suporte a bugs incluídos, termos de manutenção e evolução a partir do 31º dia.

---

## 13. Fora de escopo (explicitar evita conflito) **(+)**

Não estão inclusos, salvo contratação à parte:
- Integração com sistemas de gestão/ERP e emissão de nota fiscal
- Pagamento online, reserva com sinal ou checkout
- Aprovação de crédito ou integração com bancos/financeiras
- Aplicativo nativo iOS/Android
- Produção de conteúdo: fotos, textos e tratamento de imagem
- Gestão de tráfego pago e criação de campanhas
- Migração manual do estoque (fora do importador CSV)
- Assinatura digital de contratos
- Qualquer serviço de terceiro cobrado por uso: consulta de placa, API oficial do WhatsApp, Maps JavaScript, enriquecimento de dados

---

## 14. Faseamento sugerido

| Fase | Entrega | Objetivo |
|------|---------|----------|
| **F1 — MVP** | Site público completo, cadastro por FIPE e manual, gestão de estoque, filtros, página do veículo, leads com notificação, dois papéis de usuário, personalização, SEO base e LGPD | Colocar o estoque no ar vendendo |
| **F2 — Operação** | Pipeline de leads completo, dashboard analítico, importação em lote, simulador, alerta de preço, catálogo Meta | Transformar o site em ferramenta de gestão |
| **F3 — Escala** | Feed XML para portais, alertas de busca, filiais, comparador, webhooks, blog | Ampliar alcance sem mudar o modelo de negócio |

**Recomendação:** não negociar o F1 para baixo. Um site sem notificação de lead ou sem SSR entrega a sensação de estar pronto e não produz resultado — e a culpa recai sobre o projeto.

---

## 15. Modelo de dados — visão inicial **(+)**

```
config (registro único: identidade visual, contatos, horários)
usuario (nome, email, senha_hash, papel[admin|vendedor], ativo)
marca ─< modelo ─< versao (codigo_fipe, revisada)   base FIPE
veiculo (fk versao, ano_fab, ano_mod, km, cambio, combustivel, cor,
         carroceria, portas, preco, preco_promo, custo*, status,
         destaque, ordem, slug, entrada_estoque, meta_title, meta_desc,
         valor_fipe, fipe_consultado_em, origem_cadastro[fipe|manual])
veiculo_foto (fk veiculo, url, ordem, capa)
opcional ─< veiculo_opcional >─ veiculo
lead (nome, whatsapp, email, fk veiculo, fk usuario, tipo, status,
      motivo_perda, origem, utm_*, consentimento_em, ip)
lead_interacao (fk lead, fk usuario, texto, criado_em)
visualizacao (fk veiculo, data, contagem)
auditoria (fk usuario, entidade, acao, antes, depois, criado_em)
```
`*` campos com restrição de acesso por papel — bloqueados na camada de API, não apenas na interface.

Sem multi-tenant: nenhuma tabela carrega `revenda_id`, e `config` é um registro único.

---

## 16. Critérios de aceite **(+)**

O projeto é considerado entregue quando:
1. Um veículo cadastrado no painel aparece no site em menos de 1 minuto, com URL amigável e prévia correta no WhatsApp.
2. Um lead enviado no site chega por e-mail e WhatsApp em menos de 1 minuto e aparece no pipeline.
3. Os filtros retornam resultado correto e a URL filtrada, colada em outra aba, reproduz a mesma busca.
4. O site alcança LCP < 2,5s em conexão 4G simulada na página de estoque.
5. O dashboard bate com os dados reais de estoque e leads do período.
6. O cliente executa sozinho, após o treinamento: cadastrar veículo, trocar status, responder lead e alterar o banner.

---

## 17. Premissas e responsabilidades do cliente **(+)**

- Fotos tratadas, textos institucionais e logotipo em vetor fornecidos antes do início do desenvolvimento
- Domínio, acessos ao Google Analytics/Tag Manager/Meta Business e número de WhatsApp comercial
- Um responsável único pela aprovação, com prazo de retorno de até 3 dias úteis
- Duas rodadas de ajustes visuais inclusas; a partir da terceira, cobrança por hora
