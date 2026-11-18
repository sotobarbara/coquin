-- Coquin · site institucional · setup do Supabase (mesmo projeto do painel).
-- Rode uma vez no SQL Editor -> New query -> Run. Idempotente (pode rodar de novo).
--
-- site_contatos -> mensagens do formulário de Contato e propostas do formulário de Parceiros.
-- O visitante (sem login) só consegue ENVIAR. Ler, marcar e apagar fica com a equipe logada
-- (logins de funcionário @ponto.coquin.app ficam de fora), igual ao painel de vagas.

create table if not exists public.site_contatos (
  id         uuid primary key default gen_random_uuid(),
  tipo       text not null check (tipo in ('contato','parceiro')),
  nome       text not null check (char_length(nome) between 2 and 120),
  email      text not null check (char_length(email) between 5 and 160),
  telefone   text default '' check (char_length(coalesce(telefone,'')) <= 30),
  assunto    text default '' check (char_length(coalesce(assunto,'')) <= 80),
  mensagem   text not null check (char_length(mensagem) between 10 and 4000),
  empresa    text default '' check (char_length(coalesce(empresa,'')) <= 160),
  segmento   text default '' check (char_length(coalesce(segmento,'')) <= 60),
  cidade     text default '' check (char_length(coalesce(cidade,'')) <= 120),
  pagina     text default '' check (char_length(coalesce(pagina,'')) <= 200),
  status     text not null default 'novo',          -- novo | respondido | arquivado
  notas      text default '',
  created_at timestamptz not null default now()
);
create index if not exists site_contatos_data_idx on public.site_contatos (created_at desc);

alter table public.site_contatos enable row level security;
drop policy if exists "publico envia contato" on public.site_contatos;
drop policy if exists "equipe contatos"       on public.site_contatos;
-- visitante só INSERE, sempre como "novo" e sem notas
create policy "publico envia contato" on public.site_contatos for insert to anon, authenticated
  with check (status = 'novo' and coalesce(notas,'') = '');
-- equipe lê, atualiza e apaga
create policy "equipe contatos" on public.site_contatos for all to authenticated
  using (coalesce(auth.jwt()->>'email','') not like '%@ponto.coquin.app')
  with check (coalesce(auth.jwt()->>'email','') not like '%@ponto.coquin.app');
grant insert on public.site_contatos to anon;
