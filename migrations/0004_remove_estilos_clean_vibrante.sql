-- Os estilos Clean e Vibrante saíram do sistema: páginas que usavam um deles passam para o Moderno.
-- As cores escolhidas (tema) e o formato dos botões continuam os mesmos.
UPDATE `landing_pages` SET `estilo` = 'moderno' WHERE `estilo` IN ('clean', 'vibrante');
