-- Coquin · Propostas de evento · setup do Supabase (mesmo projeto dos outros apps).
-- Rode uma vez no SQL Editor -> New query -> Run. Idempotente (pode rodar de novo).
--
-- propostas_config  -> preços e textos. Linha 'publico' o formulário do cliente lê (sem login);
--                      linha 'interno' (custos, numeração) só a equipe vê.
-- propostas_pedidos -> pedidos que chegam pelo formulário público (eventos.coquin.com.br).
--                      O cliente só consegue ENVIAR; ler, mudar e apagar fica com a equipe.
-- propostas         -> propostas montadas no gerador, sincronizadas entre os aparelhos da equipe.
-- Logins de funcionário do ponto (@ponto.coquin.app) ficam de fora, igual ao painel de vagas.

-- ---------- configuração ----------
create table if not exists public.propostas_config (
  id         text primary key check (id in ('publico','interno')),
  dados      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.propostas_config enable row level security;
drop policy if exists "publico le config"  on public.propostas_config;
drop policy if exists "equipe config"      on public.propostas_config;
create policy "publico le config" on public.propostas_config for select to anon, authenticated
  using (id = 'publico');
create policy "equipe config" on public.propostas_config for all to authenticated
  using (coalesce(auth.jwt()->>'email','') not like '%@ponto.coquin.app')
  with check (coalesce(auth.jwt()->>'email','') not like '%@ponto.coquin.app');
grant select on public.propostas_config to anon;

-- ---------- pedidos do formulário público ----------
create table if not exists public.propostas_pedidos (
  id          uuid primary key default gen_random_uuid(),
  protocolo   text not null check (char_length(protocolo) between 4 and 20),
  nome        text not null check (char_length(nome) between 2 and 120),
  telefone    text not null check (char_length(telefone) between 8 and 30),
  email       text default '' check (char_length(coalesce(email,'')) <= 160),
  tipo        text not null check (char_length(tipo) <= 30),
  convidados  int  not null check (convidados between 1 and 20000),
  data_evento date,
  horario     text default '' check (char_length(coalesce(horario,'')) <= 10),
  local       text default '' check (char_length(coalesce(local,'')) <= 200),
  respostas   jsonb not null default '{}'::jsonb,   -- formato, horas, região, adicionais…
  obs         text default '' check (char_length(coalesce(obs,'')) <= 2000),
  estimativa  numeric(12,2) default 0,               -- total calculado na pré-proposta
  status      text not null default 'novo',          -- novo | proposta | fechado | perdido | arquivado
  notas       text default '',
  created_at  timestamptz not null default now()
);
create index if not exists propostas_pedidos_data_idx on public.propostas_pedidos (created_at desc);
alter table public.propostas_pedidos enable row level security;
drop policy if exists "publico envia pedido" on public.propostas_pedidos;
drop policy if exists "equipe pedidos"       on public.propostas_pedidos;
create policy "publico envia pedido" on public.propostas_pedidos for insert to anon, authenticated
  with check (status = 'novo' and coalesce(notas,'') = '' and pg_column_size(respostas) < 8000);
create policy "equipe pedidos" on public.propostas_pedidos for all to authenticated
  using (coalesce(auth.jwt()->>'email','') not like '%@ponto.coquin.app')
  with check (coalesce(auth.jwt()->>'email','') not like '%@ponto.coquin.app');
grant insert on public.propostas_pedidos to anon;

-- ---------- propostas do gerador ----------
create table if not exists public.propostas (
  id         text primary key,
  dados      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.propostas enable row level security;
drop policy if exists "equipe propostas" on public.propostas;
create policy "equipe propostas" on public.propostas for all to authenticated
  using (coalesce(auth.jwt()->>'email','') not like '%@ponto.coquin.app')
  with check (coalesce(auth.jwt()->>'email','') not like '%@ponto.coquin.app');

-- ---------- aviso em tempo real de pedido novo no gerador ----------
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='propostas_pedidos') then
    alter publication supabase_realtime add table public.propostas_pedidos;
  end if;
end $$;
