-- ════════════════════════════════════════════════════════════════════════════
-- Xpediente Callejero · Usuarios del CRM con permisos limitados
-- Ejecutar completo en Supabase → SQL Editor → New query → Run
-- Requiere haber ejecutado antes schema.sql.
--
-- Los administradores siguen en public.admins y ven todo.
-- Aquí van los demás usuarios con su rol:
--   periodista → solo ve el módulo Monitoreo (no puede crear ni cambiar datos)
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.equipo (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  nombre     text,
  rol        text not null check (rol in ('periodista')),
  created_at timestamptz not null default now()
);

alter table public.equipo enable row level security;

-- Cada quien solo puede leer su propio registro (para saber qué módulos ve)
drop policy if exists "equipo se ve a sí mismo" on public.equipo;
create policy "equipo se ve a sí mismo" on public.equipo
  for select to authenticated using (user_id = auth.uid());

-- ─── Dar de alta a un periodista ────────────────────────────────────────────
-- 1. Supabase → Authentication → Users → Add user → Create new user:
--    correo y contraseña, con «Auto Confirm User» activado (así no se envía correo).
-- 2. Cambia el correo y el nombre de abajo, quita los guiones del inicio y ejecútalo:
--
-- insert into public.equipo (user_id, nombre, rol)
-- select id, 'Nombre del periodista', 'periodista' from auth.users where email = 'periodista@correo.com'
-- on conflict (user_id) do update set nombre = excluded.nombre, rol = excluded.rol;
--
-- Para quitarle el acceso:
-- delete from public.equipo where user_id = (select id from auth.users where email = 'periodista@correo.com');
