-- ════════════════════════════════════════════════════════════════════════════
-- Xpediente Callejero · Video vertical para celular
-- Ejecutar completo en Supabase → SQL Editor → New query → Run
-- Requiere haber ejecutado antes 03_noticias.sql.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.noticias
  add column if not exists video_movil_url text;
