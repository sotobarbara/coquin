-- Coquin — Departamento Pessoal · setup do Supabase.
-- Rode uma vez no SQL Editor -> New query -> Run. Idempotente (pode rodar de novo).
-- Usa o MESMO projeto/login da equipe, numa tabela própria `dp_store`
-- (não mexe em vendas, estoque, escala, ponto ou checklist).
-- Só GERENTES (e-mails em public.app_admins) leem e gravam: salários ficam protegidos.

create table if not exists public.dp_store (
  key         text primary key,          -- company | cfg | emps | entries | vacations | terms | paid
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- gerentes (já existe se o app Escala foi configurado; aqui só garante)
create table if not exists public.app_admins (
  email      text primary key,
  created_at timestamptz not null default now()
);
insert into public.app_admins(email)
  select lower(email) from auth.users where email is not null and email not like '%@ponto.coquin.app'
  on conflict do nothing;
-- novo gerente depois: insert into public.app_admins(email) values ('email@dominio.com');

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.app_admins where email = lower(coalesce(auth.jwt()->>'email','')))
$$;

alter table public.dp_store  enable row level security;
alter table public.app_admins enable row level security;
drop policy if exists "dp gerente" on public.dp_store;
create policy "dp gerente" on public.dp_store for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
