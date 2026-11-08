-- Coquin — Checklist operacional · setup do Supabase.
-- Rode uma vez no SQL Editor -> New query -> Run. Idempotente (pode rodar de novo).
--
-- Este app usa o MESMO projeto Supabase da equipe (mesmo login), só que numa
-- tabela própria `checklists`, sem tocar em vendas/estoque/caixa.

-- ============ Checklist (entrada / saída por dia) ============
create table if not exists public.checklists (
  date       date not null,
  kind       text not null,               -- 'entrada' | 'saida'
  person     text default '',             -- responsável do dia (Ingrid / Paulo)
  items      jsonb default '{}'::jsonb,    -- { chave_da_tarefa: true, ... }  (tarefas ✓)
  readings   jsonb default '{}'::jsonb,    -- { chave: numero, ... }  (temperatura, desperdício, sobra)
  done_at    timestamptz,                  -- quando ficou 100% concluído
  note       text default '',              -- ocorrências / observações do dia
  updated_at timestamptz not null default now(),
  primary key (date, kind)
);
-- coluna nova (para quem já tinha a tabela): guarda os valores medidos (números)
alter table public.checklists add column if not exists readings jsonb default '{}'::jsonb;

-- ============ Tarefas editáveis (lista compartilhada por turno) ============
create table if not exists public.checklist_config (
  id         integer primary key default 1 check (id = 1),
  items      jsonb default '{}'::jsonb,     -- { entrada:[{k,t,...}], saida:[...], deposito:[...] }
  team       jsonb default '[]'::jsonb,     -- [{name, color, face?}]  (equipe editável)
  updated_at timestamptz not null default now()
);
-- coluna nova (para quem já tinha a tabela): equipe editável
alter table public.checklist_config add column if not exists team jsonb default '[]'::jsonb;

-- ============ Segurança (RLS) — só quem loga lê/escreve ============
alter table public.checklists enable row level security;
alter table public.checklist_config enable row level security;
drop policy if exists "equipe checklists" on public.checklists;
drop policy if exists "equipe checklist_config" on public.checklist_config;
create policy "equipe checklists" on public.checklists for all to authenticated using (true) with check (true);
create policy "equipe checklist_config" on public.checklist_config for all to authenticated using (true) with check (true);

-- ============ Tempo real (sincronia entre celulares) ============
do $$ begin alter publication supabase_realtime add table public.checklists; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.checklist_config; exception when duplicate_object then null; end $$;
