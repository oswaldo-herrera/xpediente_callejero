-- ════════════════════════════════════════════════════════════════════════════
-- Xpediente Callejero · Expedientes (casos con seguimiento)
-- Ejecutar completo en Supabase → SQL Editor → New query → Run
-- Requiere haber ejecutado antes 03_noticias.sql y 04_noticias_portada.sql.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.expedientes (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  municipio  text,
  categoria  text,
  estado     text not null default 'abierto'
             check (estado in ('abierto', 'investigacion', 'seguimiento', 'cerrado')),
  closed_at  timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) default auth.uid()
);

-- Una noticia puede pertenecer a un expediente; las informativas lo dejan vacío
alter table public.noticias
  add column if not exists expediente_id uuid references public.expedientes (id) on delete set null;

create index if not exists noticias_expediente_idx on public.noticias (expediente_id);

create table if not exists public.expediente_respuestas (
  id            uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references public.expedientes (id) on delete cascade,
  fecha         date not null default current_date,
  descripcion   text not null,
  url           text,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) default auth.uid()
);

create index if not exists expediente_respuestas_idx on public.expediente_respuestas (expediente_id);

alter table public.expedientes enable row level security;
alter table public.expediente_respuestas enable row level security;

-- El público solo ve (y los indicadores solo cuentan) expedientes con una nota ya visible.
-- Así una nota programada no adelanta las cifras antes de su hora.
drop policy if exists "público ve expedientes con nota visible" on public.expedientes;
create policy "público ve expedientes con nota visible" on public.expedientes
  for select using (
    public.is_admin() or exists (
      select 1 from public.noticias n
      where n.expediente_id = expedientes.id and n.published = true and n.published_at <= now()
    )
  );

drop policy if exists "admins gestionan expedientes" on public.expedientes;
create policy "admins gestionan expedientes" on public.expedientes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "público ve respuestas de expedientes visibles" on public.expediente_respuestas;
create policy "público ve respuestas de expedientes visibles" on public.expediente_respuestas
  for select using (
    exists (select 1 from public.expedientes e where e.id = expediente_id)
  );

drop policy if exists "admins gestionan respuestas" on public.expediente_respuestas;
create policy "admins gestionan respuestas" on public.expediente_respuestas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop trigger if exists expedientes_touch on public.expedientes;
create trigger expedientes_touch before update on public.expedientes
  for each row execute function public.touch_updated_at();
