-- ════════════════════════════════════════════════════════════════════════════
-- Xpediente Callejero · Permisos por módulo para el equipo
-- Ejecutar completo en Supabase → SQL Editor → New query → Run
-- Requiere 09_roles.sql y 11_comentarios.sql.
--
-- Los administradores (tabla admins) siguen viendo y editando todo.
-- A cada miembro del equipo (tabla equipo) se le marcan los módulos que puede usar
-- desde el panel de Usuarios. Aquí la base de datos respeta esas casillas:
-- solo puede guardar o borrar en los módulos que tiene marcados.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.equipo
  add column if not exists modulos text[] not null default '{monitoreo,comentarios}';

-- Los periodistas que ya existían ganan Comentarios (además de Monitoreo)
update public.equipo set modulos = array_append(modulos, 'comentarios')
where not ('comentarios' = any (modulos));

-- ¿La persona puede usar este módulo? (admin = todos)
create or replace function public.puede(modulo text)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.equipo where user_id = auth.uid() and modulo = any (modulos)
  );
$$;

-- ¿Es parte del equipo del panel? (para ver borradores, no para editarlos)
create or replace function public.en_equipo()
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_admin() or exists (select 1 from public.equipo where user_id = auth.uid());
$$;

-- ─── Videos (también los sube el módulo Noticias) ───────────────────────────
drop policy if exists "público ve videos publicados" on public.videos;
create policy "público ve videos publicados" on public.videos
  for select using (published = true or public.en_equipo());

drop policy if exists "admins gestionan videos" on public.videos;
create policy "admins gestionan videos" on public.videos
  for all to authenticated
  using (public.puede('videos') or public.puede('noticias'))
  with check (public.puede('videos') or public.puede('noticias'));

drop policy if exists "admins suben videos" on storage.objects;
create policy "admins suben videos" on storage.objects
  for insert to authenticated with check (bucket_id = 'videos' and (public.puede('videos') or public.puede('noticias')));

drop policy if exists "admins actualizan videos" on storage.objects;
create policy "admins actualizan videos" on storage.objects
  for update to authenticated using (bucket_id = 'videos' and (public.puede('videos') or public.puede('noticias')));

drop policy if exists "admins borran videos" on storage.objects;
create policy "admins borran videos" on storage.objects
  for delete to authenticated using (bucket_id = 'videos' and (public.puede('videos') or public.puede('noticias')));

-- ─── Noticias e imágenes de portada ─────────────────────────────────────────
drop policy if exists "público ve noticias publicadas" on public.noticias;
create policy "público ve noticias publicadas" on public.noticias
  for select using ((published = true and published_at <= now()) or public.en_equipo());

drop policy if exists "admins gestionan noticias" on public.noticias;
create policy "admins gestionan noticias" on public.noticias
  for all to authenticated using (public.puede('noticias')) with check (public.puede('noticias'));

drop policy if exists "admins suben imagenes" on storage.objects;
create policy "admins suben imagenes" on storage.objects
  for insert to authenticated with check (bucket_id = 'imagenes' and public.puede('noticias'));

drop policy if exists "admins borran imagenes" on storage.objects;
create policy "admins borran imagenes" on storage.objects
  for delete to authenticated using (bucket_id = 'imagenes' and public.puede('noticias'));

-- ─── Expedientes (también los crea el módulo Noticias) ──────────────────────
drop policy if exists "público ve expedientes con nota visible" on public.expedientes;
create policy "público ve expedientes con nota visible" on public.expedientes
  for select using (
    public.en_equipo() or exists (
      select 1 from public.noticias n
      where n.expediente_id = expedientes.id and n.published = true and n.published_at <= now()
    )
  );

drop policy if exists "admins gestionan expedientes" on public.expedientes;
create policy "admins gestionan expedientes" on public.expedientes
  for all to authenticated
  using (public.puede('expedientes') or public.puede('noticias'))
  with check (public.puede('expedientes') or public.puede('noticias'));

drop policy if exists "admins gestionan respuestas" on public.expediente_respuestas;
create policy "admins gestionan respuestas" on public.expediente_respuestas
  for all to authenticated using (public.puede('expedientes')) with check (public.puede('expedientes'));

-- ─── Calendario ─────────────────────────────────────────────────────────────
drop policy if exists "admins gestionan publicaciones" on public.publicaciones;
create policy "admins gestionan publicaciones" on public.publicaciones
  for all to authenticated using (public.puede('calendario')) with check (public.puede('calendario'));

-- ─── Comentarios en redes ───────────────────────────────────────────────────
drop policy if exists "admins leen comentarios" on public.comentarios;
create policy "admins leen comentarios" on public.comentarios
  for select to authenticated using (public.puede('comentarios'));
