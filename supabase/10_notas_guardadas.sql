-- ════════════════════════════════════════════════════════════════════════════
-- Xpediente Callejero · Notas guardadas del Monitoreo
-- Ejecutar completo en Supabase → SQL Editor → New query → Run
--
-- Cada usuario del CRM (admin o periodista) guarda las notas de los medios que
-- le interesan. Cada quien solo ve, guarda y borra las suyas.
-- Se copia título, medio, imagen y resumen para que sigan visibles aunque el
-- medio ya no tenga la nota en su portada.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.notas_guardadas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  link       text not null,
  titulo     text not null,
  medio      text,
  fecha      timestamptz,
  imagen     text,
  resumen    text,
  zonas      text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, link)
);

create index if not exists notas_guardadas_usuario on public.notas_guardadas (user_id, created_at desc);

alter table public.notas_guardadas enable row level security;

drop policy if exists "cada quien ve sus notas guardadas" on public.notas_guardadas;
create policy "cada quien ve sus notas guardadas" on public.notas_guardadas
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "cada quien guarda sus notas" on public.notas_guardadas;
create policy "cada quien guarda sus notas" on public.notas_guardadas
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "cada quien borra sus notas guardadas" on public.notas_guardadas;
create policy "cada quien borra sus notas guardadas" on public.notas_guardadas
  for delete to authenticated using (user_id = auth.uid());
