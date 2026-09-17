-- Editor de landing pages com estilos, tema de cores e seções.
-- Só ADD COLUMN: recriar a tabela (DROP) dispararia o ON DELETE SET NULL
-- de leads.landing_page_id e apagaria o vínculo dos leads com a página.
ALTER TABLE `landing_pages` ADD `tema` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `estilo_botao` text DEFAULT 'arredondado' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `nome_exibido` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `imagem_topo` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `video_topo` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `veu_topo` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `logo_topo` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `secao1_titulo` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `secao1_texto` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `secao2_titulo` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `secao2_texto` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `secao2_imagem` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `numeros_titulo` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `numeros` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `video_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `video_titulo` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `ficha_titulo` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `etapas_titulo` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `etapas` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `local_titulo` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `local_texto` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `mapa_endereco` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `mostrar_mapa` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `depoimentos_titulo` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `depoimentos` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `faq` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `cta_titulo` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `cta_subtitulo` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `material_chave` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `material_rotulo` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `mensagem_whatsapp` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `flutuante_ddi` text DEFAULT '55' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `flutuante_numero` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `flutuante_mensagem` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `secoes_ocultas` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `ordem_secoes` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `seo_titulo` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `seo_descricao` text DEFAULT '' NOT NULL;--> statement-breakpoint
-- Páginas existentes: estilo antigo → novo, "pausada" vira rascunho, destaques ganham ícone.
UPDATE `landing_pages` SET `status` = 'rascunho' WHERE `status` = 'pausada';--> statement-breakpoint
UPDATE `landing_pages` SET `estilo` = 'clean', `estilo_botao` = 'pilula' WHERE `estilo` = 'classico';--> statement-breakpoint
UPDATE `landing_pages` SET `estilo` = 'noturno', `estilo_botao` = 'quadrado' WHERE `estilo` = 'escuro';--> statement-breakpoint
UPDATE `landing_pages` SET `estilo` = 'editorial', `estilo_botao` = 'quadrado' WHERE `estilo` = 'impacto';--> statement-breakpoint
UPDATE `landing_pages` SET `destaques` = (
  SELECT json_group_array(json_object('rotulo', substr(value, 1, 40), 'icone', 'BadgeCheck')) FROM json_each(`landing_pages`.`destaques`) WHERE type = 'text'
) WHERE json_valid(`destaques`) AND json_type(`destaques`, '$[0]') = 'text';--> statement-breakpoint
UPDATE `landing_pages` SET
  `secao1_titulo` = 'Conheça o carro de perto.',
  `secao2_titulo` = 'Pronto para a próxima viagem.',
  `ficha_titulo` = 'Ficha técnica',
  `etapas_titulo` = 'Como comprar',
  `etapas` = '[{"titulo":"Conversa","texto":"Tire suas dúvidas pelo WhatsApp ou formulário, sem compromisso."},{"titulo":"Test drive","texto":"Agende uma visita e dirija o carro no horário que for melhor para você."},{"titulo":"Proposta","texto":"Avaliamos seu usado na troca e simulamos o financiamento na hora."},{"titulo":"Entrega","texto":"Cuidamos da documentação e da transferência. Você sai dirigindo."}]',
  `local_titulo` = 'Venha fazer um test drive.',
  `local_texto` = 'Agende sua visita e conheça o carro sem compromisso.',
  `cta_titulo` = 'Fale com um consultor',
  `cta_subtitulo` = 'Deixe seu contato e retornamos em minutos no horário comercial.',
  `video_titulo` = 'Veja o carro em vídeo'
WHERE `secao1_titulo` = '';
