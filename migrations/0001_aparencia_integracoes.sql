CREATE TABLE `integracoes` (
	`id` integer PRIMARY KEY NOT NULL,
	`meta_pixel_id` text DEFAULT '' NOT NULL,
	`google_ads_id` text DEFAULT '' NOT NULL,
	`google_ads_rotulo_lead` text DEFAULT '' NOT NULL,
	`google_ads_rotulo_whatsapp` text DEFAULT '' NOT NULL,
	`ga4_id` text DEFAULT '' NOT NULL,
	`gtm_id` text DEFAULT '' NOT NULL,
	`exigir_consentimento` integer DEFAULT true NOT NULL,
	`webhook_url` text DEFAULT '' NOT NULL,
	`webhook_segredo` text DEFAULT '' NOT NULL,
	`webhook_ultimo_status` integer,
	`webhook_ultimo_em` integer,
	`webhook_ultima_resposta` text DEFAULT '' NOT NULL,
	`atualizado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `loja` ADD `cor_primaria` text DEFAULT '#d3141f' NOT NULL;--> statement-breakpoint
ALTER TABLE `loja` ADD `cor_escura` text DEFAULT '#22232d' NOT NULL;--> statement-breakpoint
ALTER TABLE `loja` ADD `logo_chave` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `loja` ADD `logo_claro_chave` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `loja` ADD `banner_chave` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `mensagens` ADD `rastreio` text DEFAULT '{}' NOT NULL;