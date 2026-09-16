CREATE TABLE `anuncios` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`usuario_id` text NOT NULL,
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
	`cidade` text NOT NULL,
	`uf` text NOT NULL,
	`status` text DEFAULT 'ativo' NOT NULL,
	`visualizacoes` integer DEFAULT 0 NOT NULL,
	`criado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`atualizado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`marca_id`) REFERENCES `marcas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`modelo_id`) REFERENCES `modelos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `anuncios_slug_unique` ON `anuncios` (`slug`);--> statement-breakpoint
CREATE INDEX `anuncios_status_criado_idx` ON `anuncios` (`status`,`criado_em`);--> statement-breakpoint
CREATE INDEX `anuncios_marca_idx` ON `anuncios` (`marca_id`);--> statement-breakpoint
CREATE INDEX `anuncios_modelo_idx` ON `anuncios` (`modelo_id`);--> statement-breakpoint
CREATE INDEX `anuncios_preco_idx` ON `anuncios` (`preco`);--> statement-breakpoint
CREATE INDEX `anuncios_ano_idx` ON `anuncios` (`ano_modelo`);--> statement-breakpoint
CREATE INDEX `anuncios_km_idx` ON `anuncios` (`km`);--> statement-breakpoint
CREATE INDEX `anuncios_uf_idx` ON `anuncios` (`uf`);--> statement-breakpoint
CREATE INDEX `anuncios_carroceria_idx` ON `anuncios` (`carroceria`);--> statement-breakpoint
CREATE INDEX `anuncios_usuario_idx` ON `anuncios` (`usuario_id`);--> statement-breakpoint
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
CREATE TABLE `limites` (
	`chave` text PRIMARY KEY NOT NULL,
	`janela` integer NOT NULL,
	`contagem` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `marcas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`slug` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marcas_slug_unique` ON `marcas` (`slug`);--> statement-breakpoint
CREATE TABLE `mensagens` (
	`id` text PRIMARY KEY NOT NULL,
	`anuncio_id` text NOT NULL,
	`vendedor_id` text NOT NULL,
	`nome` text NOT NULL,
	`email` text NOT NULL,
	`telefone` text NOT NULL,
	`texto` text NOT NULL,
	`lida` integer DEFAULT false NOT NULL,
	`criado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`anuncio_id`) REFERENCES `anuncios`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vendedor_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `mensagens_vendedor_idx` ON `mensagens` (`vendedor_id`,`criado_em`);--> statement-breakpoint
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
CREATE TABLE `usuarios` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`email` text NOT NULL,
	`senha_hash` text NOT NULL,
	`whatsapp` text NOT NULL,
	`tipo` text DEFAULT 'particular' NOT NULL,
	`nome_loja` text,
	`cidade` text NOT NULL,
	`uf` text NOT NULL,
	`papel` text DEFAULT 'usuario' NOT NULL,
	`criado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_email_unique` ON `usuarios` (`email`);