-- Migración de DATOS de la Fase 7b (UC-15 ext.): sin cambios de esquema.
-- Renombra los tipos de fondo antiguos al nuevo catálogo (ver mapa de
-- reemplazo en docs/plan-tecnico.md, "Fase 7b"). `solido` se mantiene.

UPDATE "fondo_sitio" SET "tipo" = 'degradado_grano' WHERE "tipo" = 'degradado_animado';
UPDATE "fondo_sitio" SET "tipo" = 'aurora_mesh' WHERE "tipo" = 'aurora_animada';
UPDATE "fondo_sitio" SET "tipo" = 'particulas_red' WHERE "tipo" = 'particulas';
UPDATE "fondo_sitio" SET "tipo" = 'malla_puntos' WHERE "tipo" = 'cuadricula_animada';
UPDATE "fondo_sitio" SET "tipo" = 'ondas_fluidas' WHERE "tipo" = 'ondas';
UPDATE "fondo_sitio" SET "tipo" = 'aurora_mesh' WHERE "tipo" = 'malla_difusa';
UPDATE "fondo_sitio" SET "tipo" = 'haces_luz' WHERE "tipo" = 'lineas_diagonales';
