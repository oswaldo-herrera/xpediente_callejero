-- ════════════════════════════════════════════════════════════════════════════
-- Xpediente Callejero · Comentarios de redes sociales (para el reporte)
-- Ejecutar completo en Supabase → SQL Editor → New query → Run
--
-- El servidor (/api/comentarios, con la llave service_role) trae los comentarios
-- de YouTube (y después Facebook, Instagram…) y los guarda aquí.
-- Solo los administradores pueden leerlos desde el panel.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.comentarios (
  id                 text primary key,          -- red:id_del_comentario
  red                text not null,             -- youtube | facebook | instagram | tiktok | x
  publicacion_id     text,
  publicacion_titulo text,
  publicacion_url    text,
  autor              text,
  texto              text not null default '',
  fecha              timestamptz,
  likes              integer not null default 0,
  respuestas         integer not null default 0,
  es_respuesta       boolean not null default false,
  del_canal          boolean not null default false,  -- lo escribió nuestra cuenta
  sincronizado_at    timestamptz not null default now()
);

create index if not exists comentarios_fecha on public.comentarios (fecha desc);
create index if not exists comentarios_red on public.comentarios (red, fecha desc);

alter table public.comentarios enable row level security;

drop policy if exists "admins leen comentarios" on public.comentarios;
create policy "admins leen comentarios" on public.comentarios
  for select to authenticated using (public.is_admin());
