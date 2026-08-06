-- Coquin — Checklist operacional · setup do Supabase.
-- Rode uma vez no SQL Editor -> New query -> Run. Idempotente (pode rodar de novo).
--
-- Este app usa o MESMO projeto Supabase da equipe (mesmo login), só que numa
-- tabela própria `checklists`, sem tocar em vendas/estoque/caixa.

-- ============ Checklist (entrada / saída por dia) ============
create table if not exists public.checklists (
  date       date not null,
  kind       text not null,               -- 'entrada' | 'saida'
  person     text default '',             -- responsável do dia (Ionnara / Ingrid / Paulo)
  items      jsonb default '{}'::jsonb,    -- { chave_da_tarefa: true, ... }
  done_at    timestamptz,                  -- quando ficou 100% concluído
  note       text default '',
  updated_at timestamptz not null default now(),
  primary key (date, kind)
);

-- ============ Segurança (RLS) — só quem loga lê/escreve ============
alter table public.checklists enable row level security;
drop policy if exists "equipe checklists" on public.checklists;
create policy "equipe checklists" on public.checklists for all to authenticated using (true) with check (true);

-- ============ Tempo real (sincronia entre celulares) ============
do $$ begin alter publication supabase_realtime add table public.checklists; exception when duplicate_object then null; end $$;
