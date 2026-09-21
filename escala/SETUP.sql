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
  scale       text default '6x1',          -- 6x1 | 5x2 | 4x3
  start_t     text default '10:00',         -- hora de entrada da pessoa
  end_t       text default '19:00',         -- hora de saída
  lunch       integer default 60,           -- intervalo em minutos (art. 71)
  contract    text default 'clt',           -- 'clt' | 'pj' (PJ fica fora das regras da CLT)
  shift_pref  text default '',              -- (legado v1)
  weekly      numeric default 44,           -- (legado v1)
  pref_off    jsonb default '[]'::jsonb,    -- dias da semana da folga [0..6] (0=domingo)
  fixed_off   boolean default false,        -- folga fixa: sempre nesses dias da semana
  pin         text default '',              -- senha do ponto (4 dígitos)
  admission   date,
  updated_at  timestamptz not null default now()
);

-- ============ Escala (um turno por pessoa por dia) ============
create table if not exists public.shift_schedule (
  date       date not null,
  emp        text not null,
  shift      text not null,                 -- W (trabalha na jornada da pessoa) · F | FE | AT | FA
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
                                                   -- kind: entrada | intervalo | lanche | pessoal | saida | retorno
  note       text default '',                     -- justificativa de ajuste
  updated_at timestamptz not null default now(),
  primary key (date, emp)
);
create index if not exists time_punches_emp_idx on public.time_punches (emp, date);

-- ============ Configuração (linha única) ============
create table if not exists public.shift_config (
  id      integer primary key default 1 check (id = 1),
  shifts  jsonb,     -- (legado v1)
  demand  jsonb,     -- mínimo de pessoas por dia da semana: {"0":2,"1":2,...}
  rules   jsonb      -- regras da CLT (44h, 6 dias, domingo a cada 3 semanas, 11h…)
);

-- colunas novas da v2 (para quem já rodou a v1)
alter table public.shift_employees add column if not exists start_t  text default '10:00';
alter table public.shift_employees add column if not exists end_t    text default '19:00';
alter table public.shift_employees add column if not exists lunch    integer default 60;
alter table public.shift_employees add column if not exists contract text default 'clt';
alter table public.shift_employees add column if not exists scale     text default '6x1';
alter table public.shift_employees add column if not exists fixed_off boolean default false;
-- a v1 guardava o turno em M/T/I; a v2 usa a jornada da própria pessoa
update public.shift_schedule set shift='W' where shift in ('M','T','I');

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
