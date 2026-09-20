-- Coquin — Escala & Ponto · setup do Supabase.
-- Rode uma vez no SQL Editor -> New query -> Run. Idempotente (pode rodar de novo).
--
-- Este app usa o MESMO projeto Supabase da equipe (mesmo login), em tabelas
-- próprias `shift_*` / `time_punches`, sem tocar em vendas, estoque, caixa
-- ou no checklist.

-- ============ Equipe ============
create table if not exists public.shift_employees (
  id          text primary key,             -- slug do nome (ex.: 'ionnara')
  name        text not null,
  role        text default '',              -- cargo
  color       text default '#446349',
  face        jsonb,                        -- traços do avatar (opcional)
  active      boolean not null default true,
  shift_pref  text default '',              -- turno preferido: M | T | I
  scale       text default '6x1',
  weekly      numeric default 44,           -- horas contratadas por semana
  pref_off    jsonb default '[]'::jsonb,    -- dias da semana de folga preferida [0..6]
  pin         text default '',              -- senha do ponto (4 dígitos)
  admission   date,
  updated_at  timestamptz not null default now()
);

-- ============ Escala (um turno por pessoa por dia) ============
create table if not exists public.shift_schedule (
  date       date not null,
  emp        text not null,
  shift      text not null,                 -- M | T | I (turnos) · F | FE | AT | FA
  locked     boolean not null default false,-- travado: gerador e trocas não mexem
  src        text default 'auto',           -- auto | manual | swap
  note       text default '',
  updated_at timestamptz not null default now(),
  primary key (date, emp)
);
create index if not exists shift_schedule_emp_idx on public.shift_schedule (emp, date);

-- ============ Trocas de folga ============
create table if not exists public.shift_swaps (
  id          text primary key,
  emp         text not null,                -- quem pediu
  from_date   date not null,                -- folga atual
  to_date     date not null,                -- dia em que quer folgar
  cover       text,                         -- quem cobre o turno
  status      text not null default 'pendente',  -- pendente | aprovada | recusada
  reason      text default '',
  changes     jsonb default '[]'::jsonb,    -- recálculo: o que muda nos próximos dias
  warns       jsonb default '[]'::jsonb,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ============ Ponto (marcações do dia) ============
create table if not exists public.time_punches (
  date       date not null,
  emp        text not null,
  marks      jsonb not null default '[]'::jsonb,  -- [{t:'09:03', iso, nsr, kind, geo, adj}]
  note       text default '',                     -- justificativa de ajuste
  updated_at timestamptz not null default now(),
  primary key (date, emp)
);
create index if not exists time_punches_emp_idx on public.time_punches (emp, date);

-- ============ Configuração (linha única) ============
create table if not exists public.shift_config (
  id      integer primary key default 1 check (id = 1),
  shifts  jsonb,     -- turnos: horários e intervalo
  demand  jsonb,     -- quantas pessoas por turno em cada dia da semana
  rules   jsonb      -- regras da CLT (44h, 6 dias, domingo a cada 3 semanas, 11h…)
);

-- ============ Segurança (RLS) — só quem loga lê/escreve ============
alter table public.shift_employees enable row level security;
alter table public.shift_schedule  enable row level security;
alter table public.shift_swaps     enable row level security;
alter table public.time_punches    enable row level security;
alter table public.shift_config    enable row level security;
drop policy if exists "equipe shift_employees" on public.shift_employees;
drop policy if exists "equipe shift_schedule"  on public.shift_schedule;
drop policy if exists "equipe shift_swaps"     on public.shift_swaps;
drop policy if exists "equipe time_punches"    on public.time_punches;
drop policy if exists "equipe shift_config"    on public.shift_config;
create policy "equipe shift_employees" on public.shift_employees for all to authenticated using (true) with check (true);
create policy "equipe shift_schedule"  on public.shift_schedule  for all to authenticated using (true) with check (true);
create policy "equipe shift_swaps"     on public.shift_swaps     for all to authenticated using (true) with check (true);
create policy "equipe time_punches"    on public.time_punches    for all to authenticated using (true) with check (true);
create policy "equipe shift_config"    on public.shift_config    for all to authenticated using (true) with check (true);

-- ============ Tempo real (sincronia entre celulares) ============
do $$ begin alter publication supabase_realtime add table public.shift_employees; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.shift_schedule;  exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.shift_swaps;     exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.time_punches;    exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.shift_config;    exception when duplicate_object then null; end $$;
