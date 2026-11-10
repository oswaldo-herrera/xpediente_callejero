-- ════════════════════════════════════════════════════════════════════════════
-- Xpediente Callejero · Fotos y PDF adjuntos a las denuncias
-- Ejecutar completo en Supabase → SQL Editor → New query → Run
-- Requiere haber ejecutado antes schema.sql (usa public.is_admin()).
-- ════════════════════════════════════════════════════════════════════════════

-- Bucket público de lectura: el enlace va en el mensaje de WhatsApp.
-- Máximo 10 MB por archivo; solo imágenes y PDF.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('denuncias', 'denuncias', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Cualquier visitante puede subir (no puede listar, cambiar ni borrar)
drop policy if exists "público sube archivos de denuncia" on storage.objects;
create policy "público sube archivos de denuncia" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'denuncias');

drop policy if exists "admins borran archivos de denuncia" on storage.objects;
create policy "admins borran archivos de denuncia" on storage.objects
  for delete to authenticated using (bucket_id = 'denuncias' and public.is_admin());
