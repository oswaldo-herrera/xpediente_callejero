-- ════════════════════════════════════════════════════════════════════════════
-- Xpediente Callejero · Contador de visitas del footer
-- Ejecutar completo en Supabase → SQL Editor → New query → Run
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.contador_visitas (
  id    int primary key default 1 check (id = 1),  -- una sola fila
  total bigint not null default 0
);

insert into public.contador_visitas (id, total) values (1, 0)
on conflict (id) do nothing;

alter table public.contador_visitas enable row level security;

-- Cualquiera puede leer el total, pero nadie puede escribirlo directamente
drop policy if exists "público ve el contador" on public.contador_visitas;
create policy "público ve el contador" on public.contador_visitas
  for select using (true);

-- La única forma de cambiarlo: sumar 1
create or replace function public.registrar_visita()
returns bigint
language sql
security definer
set search_path = ''
as $$
  update public.contador_visitas set total = total + 1 where id = 1 returning total;
$$;

revoke all on function public.registrar_visita() from public;
grant execute on function public.registrar_visita() to anon, authenticated;
