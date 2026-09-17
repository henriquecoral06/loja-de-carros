CREATE TABLE `arquivos` (
	`chave` text PRIMARY KEY NOT NULL,
	`tipo` text NOT NULL,
	`tamanho` integer NOT NULL,
	`dados` blob NOT NULL,
	`criado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
