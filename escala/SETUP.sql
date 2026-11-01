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

-- ============ Folha de pagamento (v3) ============
-- salário e benefícios de cada pessoa (ficam null até alguém cadastrar pelo app)
alter table public.shift_employees add column if not exists salary  numeric;   -- salário base (R$)
alter table public.shift_employees add column if not exists food    numeric;   -- alimentação por mês (R$)
alter table public.shift_employees add column if not exists vt_day  numeric;   -- vale-transporte por dia (R$)
alter table public.shift_employees add column if not exists adv_pct numeric;   -- % do adiantamento (null = padrão da folha)
alter table public.shift_employees add column if not exists deps    integer;   -- dependentes no IRRF
alter table public.shift_config    add column if not exists payroll jsonb;     -- ajustes da folha (INSS, VT, adiantamento…)

-- lançamentos da folha: horas extras, atrasos, bônus, vales, descontos, adiantamento ajustado, pagamentos feitos
-- (as FALTAS ficam na própria escala: shift_schedule.shift = 'FA'; atestado = 'AT')
create table if not exists public.payroll_entries (
  id         text primary key,
  ym         text not null,                 -- mês da folha: '2026-11'
  emp        text not null,
  kind       text not null,                 -- extra | menos | bonus | vale | desc | adiant | pago
  date       date,
  qty        numeric,                       -- minutos (extra / menos)
  pct        numeric,                       -- adicional da hora extra (50, 100…)
  amount     numeric,                       -- R$ (bonus, vale, desc, adiant, pago)
  note       text default '',               -- em 'pago': 'adiant' | 'saldo'
  created_at timestamptz not null default now()
);
create index if not exists payroll_entries_ym_idx on public.payroll_entries (ym, emp);

-- ============ Acesso individual (v4): gerentes × funcionários ============
-- Gerente (acesso total): e-mail na tabela app_admins. Ao rodar este script, TODOS os logins
-- que já existem no projeto (ex.: o login da equipe) viram gerentes.
-- Funcionário: login criado pelo app (usuário@ponto.coquin.app), ligado à pessoa da equipe.
-- Ele só bate o PRÓPRIO ponto (com a hora do servidor), vê a escala e pede troca de folga.
-- Salários e folha ficam só para gerentes.
create table if not exists public.app_admins (
  email      text primary key,
  created_at timestamptz not null default now()
);
insert into public.app_admins(email)
  select lower(email) from auth.users where email is not null and email not like '%@ponto.coquin.app'
  on conflict do nothing;
-- novo gerente depois: insert into public.app_admins(email) values ('email@dominio.com');

alter table public.shift_employees add column if not exists login_email text;   -- login do funcionário

-- salário e benefícios saem de shift_employees (que o funcionário enxerga) e vão para uma tabela só de gerente
create table if not exists public.payroll_people (
  emp        text primary key,
  salary     numeric,
  food       numeric,
  vt_day     numeric,
  adv_pct    numeric,
  deps       integer,
  updated_at timestamptz not null default now()
);
insert into public.payroll_people(emp, salary, food, vt_day, adv_pct, deps)
  select id, salary, food, vt_day, adv_pct, deps from public.shift_employees
  where salary is not null or food is not null or vt_day is not null
  on conflict (emp) do nothing;
update public.shift_employees set salary=null, food=null, vt_day=null, adv_pct=null, deps=null
  where salary is not null or food is not null or vt_day is not null or adv_pct is not null or deps is not null;

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.app_admins where email = lower(coalesce(auth.jwt()->>'email','')))
$$;
create or replace function public.my_emp() returns text
  language sql stable security definer set search_path = public as $$
  select id from public.shift_employees where lower(login_email) = lower(coalesce(auth.jwt()->>'email','')) limit 1
$$;
create or replace function public.my_role() returns json
  language sql stable security definer set search_path = public as $$
  select json_build_object('admin', public.is_admin(), 'emp', public.my_emp())
$$;
create or replace function public.server_now() returns timestamptz language sql stable as $$ select now() $$;

-- trava do ponto do funcionário: só a própria pessoa, só acrescenta marcação,
-- sempre com o horário do servidor (tolerância de 3 min) e no dia de hoje
create or replace function public.guard_punch() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  prev jsonb; prev_note text; n int; i int; m jsonb;
  nowl timestamp := (now() at time zone 'America/Sao_Paulo');
begin
  if public.is_admin() then return new; end if;
  if new.emp is distinct from public.my_emp() then raise exception 'Você só pode registrar o seu próprio ponto'; end if;
  select marks, note into prev, prev_note from public.time_punches where date = new.date and emp = new.emp;
  prev := coalesce(prev, '[]'::jsonb);
  n := jsonb_array_length(prev);
  if jsonb_array_length(coalesce(new.marks,'[]'::jsonb)) < n then raise exception 'Marcação não pode ser apagada'; end if;
  for i in 0 .. n-1 loop
    if (new.marks->i)->>'t' is distinct from (prev->i)->>'t' or (new.marks->i)->>'kind' is distinct from (prev->i)->>'kind' then
      raise exception 'Marcação já registrada não pode ser alterada';
    end if;
  end loop;
  for i in n .. jsonb_array_length(new.marks)-1 loop
    m := new.marks->i;
    if new.date <> nowl::date then raise exception 'O ponto só pode ser registrado no dia de hoje'; end if;
    if abs(extract(epoch from ((nowl::date + (m->>'t')::time) - nowl))) > 180 then
      raise exception 'Horário diferente do relógio do servidor';
    end if;
  end loop;
  new.note := coalesce(prev_note, '');
  return new;
end $$;
drop trigger if exists guard_punch on public.time_punches;
create trigger guard_punch before insert or update on public.time_punches
  for each row execute function public.guard_punch();

-- ============ Atestados enviados pelo portal do colaborador (v4) ============
create table if not exists public.absence_docs (
  id          text primary key,
  emp         text not null,
  date_from   date not null,
  date_to     date,
  kind        text default 'atestado',
  status      text not null default 'pendente',   -- pendente | aprovado | recusado
  note        text default '',
  file_path   text,                               -- arquivo no Storage: atestados/<emp>/<id>.jpg
  file_name   text,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);
-- arquivos: bucket privado (só a própria pessoa e o gerente abrem)
insert into storage.buckets (id, name, public) values ('atestados','atestados', false) on conflict (id) do nothing;
drop policy if exists "atestados enviar" on storage.objects;
drop policy if exists "atestados ver"    on storage.objects;
drop policy if exists "atestados gerente" on storage.objects;
create policy "atestados enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'atestados' and (public.is_admin() or (storage.foldername(name))[1] = public.my_emp()));
create policy "atestados ver" on storage.objects for select to authenticated
  using (bucket_id = 'atestados' and (public.is_admin() or (storage.foldername(name))[1] = public.my_emp()));
create policy "atestados gerente" on storage.objects for delete to authenticated
  using (bucket_id = 'atestados' and public.is_admin());

-- ============ Segurança (RLS) ============
alter table public.shift_employees enable row level security;
alter table public.shift_schedule  enable row level security;
alter table public.shift_swaps     enable row level security;
alter table public.time_punches    enable row level security;
alter table public.shift_config    enable row level security;
alter table public.payroll_entries enable row level security;
alter table public.payroll_people  enable row level security;
alter table public.app_admins      enable row level security;
alter table public.absence_docs    enable row level security;
drop policy if exists "equipe shift_employees" on public.shift_employees;
drop policy if exists "equipe shift_schedule"  on public.shift_schedule;
drop policy if exists "equipe shift_swaps"     on public.shift_swaps;
drop policy if exists "equipe time_punches"    on public.time_punches;
drop policy if exists "equipe shift_config"    on public.shift_config;
drop policy if exists "equipe payroll_entries" on public.payroll_entries;
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname='public'
    and tablename in ('shift_employees','shift_schedule','shift_swaps','time_punches','shift_config','payroll_entries','payroll_people','app_admins','absence_docs')
    and policyname like 'v4 %'
  loop execute format('drop policy %I on public.%I', r.policyname, r.tablename); end loop;
end $$;
-- todo mundo logado (gerente ou funcionário) vê a equipe, a escala, as trocas e as regras
create policy "v4 ler equipe"    on public.shift_employees for select to authenticated using (public.is_admin() or public.my_emp() is not null);
create policy "v4 ler escala"    on public.shift_schedule  for select to authenticated using (public.is_admin() or public.my_emp() is not null);
create policy "v4 ler trocas"    on public.shift_swaps     for select to authenticated using (public.is_admin() or public.my_emp() is not null);
create policy "v4 ler ajustes"   on public.shift_config    for select to authenticated using (public.is_admin() or public.my_emp() is not null);
-- só gerente altera equipe, escala e ajustes
create policy "v4 gerente equipe"  on public.shift_employees for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "v4 gerente escala"  on public.shift_schedule  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "v4 gerente ajustes" on public.shift_config    for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- trocas: funcionário pede a dele (pendente); gerente aprova/recusa
create policy "v4 gerente trocas"  on public.shift_swaps for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "v4 pedir troca"     on public.shift_swaps for insert to authenticated with check (emp = public.my_emp() and status = 'pendente');
-- ponto: gerente tudo; funcionário só o dele (a trava acima garante a hora)
create policy "v4 gerente ponto"   on public.time_punches for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "v4 ver meu ponto"   on public.time_punches for select to authenticated using (emp = public.my_emp());
create policy "v4 bater meu ponto" on public.time_punches for insert to authenticated with check (emp = public.my_emp());
create policy "v4 seguir meu ponto" on public.time_punches for update to authenticated using (emp = public.my_emp()) with check (emp = public.my_emp());
-- folha e salários: só gerente
create policy "v4 gerente folha"   on public.payroll_entries for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "v4 gerente salario" on public.payroll_people  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "v4 gerentes"        on public.app_admins      for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- atestados: funcionário envia e vê os dele; gerente vê todos e aprova
create policy "v4 gerente atestados" on public.absence_docs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "v4 ver meus atestados" on public.absence_docs for select to authenticated using (emp = public.my_emp());
create policy "v4 enviar atestado"    on public.absence_docs for insert to authenticated with check (emp = public.my_emp() and status = 'pendente');

-- ============ Tempo real (sincronia entre celulares) ============
do $$ begin alter publication supabase_realtime add table public.shift_employees; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.shift_schedule;  exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.shift_swaps;     exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.time_punches;    exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.shift_config;    exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.payroll_entries; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.payroll_people;  exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.absence_docs;    exception when duplicate_object then null; end $$;
