CREATE TABLE `anuncios` (
	`id` text PRIMARY KEY NOT NULL,
	`codigo` integer NOT NULL,
	`slug` text NOT NULL,
	`marca_id` integer NOT NULL,
	`modelo_id` integer NOT NULL,
	`versao` text NOT NULL,
	`ano_fabricacao` integer NOT NULL,
	`ano_modelo` integer NOT NULL,
	`km` integer NOT NULL,
	`preco` integer NOT NULL,
	`cambio` text NOT NULL,
	`combustivel` text NOT NULL,
	`carroceria` text NOT NULL,
	`cor` text NOT NULL,
	`portas` integer DEFAULT 4 NOT NULL,
	`opcionais` text DEFAULT '[]' NOT NULL,
	`descricao` text DEFAULT '' NOT NULL,
	`destaque` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'ativo' NOT NULL,
	`visualizacoes` integer DEFAULT 0 NOT NULL,
	`vendedor_id` text,
	`criado_por` text,
	`criado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`atualizado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`marca_id`) REFERENCES `marcas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`modelo_id`) REFERENCES `modelos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vendedor_id`) REFERENCES `vendedores`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `anuncios_codigo_unique` ON `anuncios` (`codigo`);--> statement-breakpoint
CREATE UNIQUE INDEX `anuncios_slug_unique` ON `anuncios` (`slug`);--> statement-breakpoint
CREATE INDEX `anuncios_status_criado_idx` ON `anuncios` (`status`,`criado_em`);--> statement-breakpoint
CREATE INDEX `anuncios_destaque_idx` ON `anuncios` (`status`,`destaque`);--> statement-breakpoint
CREATE INDEX `anuncios_marca_idx` ON `anuncios` (`marca_id`);--> statement-breakpoint
CREATE INDEX `anuncios_modelo_idx` ON `anuncios` (`modelo_id`);--> statement-breakpoint
CREATE INDEX `anuncios_preco_idx` ON `anuncios` (`preco`);--> statement-breakpoint
CREATE INDEX `anuncios_ano_idx` ON `anuncios` (`ano_modelo`);--> statement-breakpoint
CREATE INDEX `anuncios_km_idx` ON `anuncios` (`km`);--> statement-breakpoint
CREATE INDEX `anuncios_carroceria_idx` ON `anuncios` (`carroceria`);--> statement-breakpoint
CREATE TABLE `envios` (
	`id` text PRIMARY KEY NOT NULL,
	`canal` text NOT NULL,
	`sucesso` integer NOT NULL,
	`status` integer DEFAULT 0 NOT NULL,
	`detalhe` text DEFAULT '' NOT NULL,
	`criado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `envios_criado_idx` ON `envios` (`criado_em`);--> statement-breakpoint
CREATE TABLE `fotos` (
	`id` text PRIMARY KEY NOT NULL,
	`anuncio_id` text NOT NULL,
	`chave` text NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`criado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`anuncio_id`) REFERENCES `anuncios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `fotos_anuncio_ordem_idx` ON `fotos` (`anuncio_id`,`ordem`);--> statement-breakpoint
CREATE TABLE `integracoes` (
	`id` integer PRIMARY KEY NOT NULL,
	`webhook_url` text DEFAULT '' NOT NULL,
	`webhook_segredo` text DEFAULT '' NOT NULL,
	`api_token_hash` text DEFAULT '' NOT NULL,
	`api_token_final` text DEFAULT '' NOT NULL,
	`api_token_criado_em` integer,
	`meta_pixel_id` text DEFAULT '' NOT NULL,
	`meta_codigo_teste` text DEFAULT '' NOT NULL,
	`meta_token_capi` text DEFAULT '' NOT NULL,
	`google_ads_id` text DEFAULT '' NOT NULL,
	`ga4_id` text DEFAULT '' NOT NULL,
	`gtm_id` text DEFAULT '' NOT NULL,
	`conversoes` text DEFAULT '{}' NOT NULL,
	`exigir_consentimento` integer DEFAULT true NOT NULL,
	`resend_api_key` text DEFAULT '' NOT NULL,
	`resend_remetente` text DEFAULT '' NOT NULL,
	`resend_destinatarios` text DEFAULT '' NOT NULL,
	`atualizado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `landing_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`anuncio_id` text NOT NULL,
	`titulo` text NOT NULL,
	`headline` text NOT NULL,
	`subtitulo` text DEFAULT '' NOT NULL,
	`destaques` text DEFAULT '[]' NOT NULL,
	`texto_botao` text DEFAULT 'Quero este carro' NOT NULL,
	`mostrar_preco` integer DEFAULT true NOT NULL,
	`estilo` text DEFAULT 'classico' NOT NULL,
	`status` text DEFAULT 'ativa' NOT NULL,
	`visitas` integer DEFAULT 0 NOT NULL,
	`criado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`atualizado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`anuncio_id`) REFERENCES `anuncios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `landing_pages_slug_unique` ON `landing_pages` (`slug`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`anuncio_id` text,
	`landing_page_id` text,
	`vendedor_id` text,
	`origem` text NOT NULL,
	`nome` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`telefone` text NOT NULL,
	`texto` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'novo' NOT NULL,
	`notas` text DEFAULT '' NOT NULL,
	`rastreio` text DEFAULT '{}' NOT NULL,
	`criado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`atualizado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`anuncio_id`) REFERENCES `anuncios`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`landing_page_id`) REFERENCES `landing_pages`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`vendedor_id`) REFERENCES `vendedores`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `leads_criado_idx` ON `leads` (`criado_em`);--> statement-breakpoint
CREATE INDEX `leads_status_idx` ON `leads` (`status`,`criado_em`);--> statement-breakpoint
CREATE TABLE `limites` (
	`chave` text PRIMARY KEY NOT NULL,
	`janela` integer NOT NULL,
	`contagem` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `loja` (
	`id` integer PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`slogan` text DEFAULT '' NOT NULL,
	`sobre` text DEFAULT '' NOT NULL,
	`cnpj` text DEFAULT '' NOT NULL,
	`whatsapp_ddi` text DEFAULT '55' NOT NULL,
	`whatsapp` text DEFAULT '' NOT NULL,
	`telefone_ddi` text DEFAULT '55' NOT NULL,
	`telefone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`endereco` text DEFAULT '' NOT NULL,
	`bairro` text DEFAULT '' NOT NULL,
	`cidade` text DEFAULT '' NOT NULL,
	`uf` text DEFAULT '' NOT NULL,
	`cep` text DEFAULT '' NOT NULL,
	`horario` text DEFAULT '' NOT NULL,
	`instagram` text DEFAULT '' NOT NULL,
	`facebook` text DEFAULT '' NOT NULL,
	`tiktok` text DEFAULT '' NOT NULL,
	`youtube` text DEFAULT '' NOT NULL,
	`cor_primaria` text DEFAULT '#d3141f' NOT NULL,
	`cor_secundaria` text DEFAULT '#a80f18' NOT NULL,
	`cor_escura` text DEFAULT '#22232d' NOT NULL,
	`logo_chave` text DEFAULT '' NOT NULL,
	`logo_claro_chave` text DEFAULT '' NOT NULL,
	`whatsapp_flutuante` integer DEFAULT true NOT NULL,
	`whatsapp_mensagem` text DEFAULT 'Olá! Vim pelo site e gostaria de mais informações.' NOT NULL,
	`hero_titulo` text DEFAULT '' NOT NULL,
	`hero_subtitulo` text DEFAULT '' NOT NULL,
	`banner_chave` text DEFAULT '' NOT NULL,
	`hero_video` text DEFAULT '' NOT NULL,
	`texto_venda_carro` text DEFAULT '' NOT NULL,
	`feed_ativo` integer DEFAULT false NOT NULL,
	`feed_token` text DEFAULT '' NOT NULL,
	`atualizado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `marcas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`slug` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marcas_slug_unique` ON `marcas` (`slug`);--> statement-breakpoint
CREATE TABLE `modelos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`marca_id` integer NOT NULL,
	`nome` text NOT NULL,
	`slug` text NOT NULL,
	FOREIGN KEY (`marca_id`) REFERENCES `marcas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `modelos_marca_slug_uq` ON `modelos` (`marca_id`,`slug`);--> statement-breakpoint
CREATE TABLE `sessoes` (
	`id` text PRIMARY KEY NOT NULL,
	`usuario_id` text,
	`dados` text DEFAULT '{}' NOT NULL,
	`expira_em` integer NOT NULL,
	`criado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessoes_expira_idx` ON `sessoes` (`expira_em`);--> statement-breakpoint
CREATE INDEX `sessoes_usuario_idx` ON `sessoes` (`usuario_id`);--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`email` text NOT NULL,
	`senha_hash` text NOT NULL,
	`criado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_email_unique` ON `usuarios` (`email`);--> statement-breakpoint
CREATE TABLE `vendedores` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`whatsapp_ddi` text DEFAULT '55' NOT NULL,
	`whatsapp` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`foto_chave` text DEFAULT '' NOT NULL,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
