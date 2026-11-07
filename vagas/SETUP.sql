-- Coquin — Vagas & Candidaturas · setup do Supabase.
-- Rode uma vez no SQL Editor -> New query -> Run. Idempotente (pode rodar de novo).
--
-- Usa o MESMO projeto Supabase da equipe (mesmo login), em tabelas próprias:
--   vagas         -> as vagas abertas + regras de pontuação (perguntas, pesos, palavras-chave)
--   candidaturas  -> quem se inscreveu pelo link (respostas + caminho do CV)
--   bucket "cvs"  -> arquivos de currículo (PRIVADO)
--
-- Quem NÃO está logado (o candidato que veio do Instagram) só consegue:
--   * ler vagas ativas, * enviar UMA candidatura, * subir o arquivo do CV.
-- Não consegue ler nem alterar candidaturas ou CVs de ninguém.
-- Só a equipe logada (e não os logins de funcionário @ponto.coquin.app) vê e avalia.

-- ============ Vagas ============
create table if not exists public.vagas (
  id          text primary key,                 -- slug usado no link: ?v=atendente-imprensa
  title       text not null,
  store       text default '',                  -- loja / unidade
  kind        text default 'CLT',               -- CLT | Freela | PJ | Estágio
  salary      text default '',                  -- texto livre: "R$ 1.800 + VT + VR"
  description text default '',
  perks       text default '',                  -- um benefício por linha
  active      boolean not null default true,
  cv_required boolean not null default true,
  questions   jsonb not null default '[]'::jsonb,   -- perguntas + pontos por resposta + eliminatórias
  keywords    jsonb not null default '[]'::jsonb,   -- [{w:"sorveteria",pts:3}, ...]
  kw_max      integer default 8,                    -- teto de pontos por palavras-chave
  thresholds  jsonb default '{"a":75,"b":50}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============ Candidaturas ============
create table if not exists public.candidaturas (
  id         uuid primary key default gen_random_uuid(),
  vaga_id    text not null references public.vagas(id) on delete cascade,
  name       text not null check (char_length(name) between 2 and 120),
  phone      text default '',                  -- opcional (o formulário pede só nome, e-mail e CV)
  email      text default '' check (char_length(email) <= 160),
  city       text default '' check (char_length(city) <= 120),
  about      text default '' check (char_length(about) <= 3000),
  answers    jsonb not null default '{}'::jsonb,
  cv_path    text,
  cv_name    text,
  cv_text    text,                             -- texto lido do CV pelo painel (usado no score)
  consent    boolean not null default false,
  status     text not null default 'novo',     -- novo | triagem | entrevista | aprovado | reprovado
  stars      integer default 0,                -- sua nota manual (0..5)
  notes      text default '',                  -- anotações da equipe
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- atualização: formulário rápido (nome, e-mail, CV) + leitura do currículo
alter table public.candidaturas alter column phone drop not null;
alter table public.candidaturas alter column phone set default '';
alter table public.candidaturas drop constraint if exists candidaturas_phone_check;
alter table public.candidaturas add constraint candidaturas_phone_check check (char_length(coalesce(phone,'')) <= 30);
alter table public.candidaturas add column if not exists cv_text text;
alter table public.candidaturas add column if not exists cv_photo text;   -- foto achada no CV (miniatura); '' = não tem

-- atualização: vagas criadas a partir dos banners
alter table public.vagas add column if not exists banner_path text;          -- arte da vaga (bucket público "banners")
alter table public.vagas add column if not exists openings integer default 1; -- nº de posições

create index if not exists candidaturas_vaga_idx on public.candidaturas (vaga_id, created_at desc);
-- deixa rápida a checagem de candidatura repetida (mesmo com milhares de inscrições)
create index if not exists candidaturas_vaga_email_idx on public.candidaturas (vaga_id, lower(trim(email)));

-- ============ 1 candidatura por e-mail em cada vaga ============
-- (trigger em vez de índice único: funciona mesmo se já existirem repetidas de testes)
create or replace function public.candidaturas_unica() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.candidaturas c
             where c.vaga_id = new.vaga_id and lower(trim(c.email)) = lower(trim(new.email)) and c.id <> new.id) then
    raise exception 'ja_candidatou' using errcode = '23505';
  end if;
  return new;
end $$;
drop trigger if exists candidaturas_unica on public.candidaturas;
create trigger candidaturas_unica before insert on public.candidaturas
  for each row execute function public.candidaturas_unica();

-- o formulário pergunta antes de subir o CV (responde só sim/não, não expõe dados)
create or replace function public.ja_candidatou(p_vaga text, p_email text) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.candidaturas
                 where vaga_id = p_vaga and lower(trim(email)) = lower(trim(p_email)));
$$;
grant execute on function public.ja_candidatou(text, text) to anon, authenticated;

-- ============ Segurança (RLS) ============
alter table public.vagas        enable row level security;
alter table public.candidaturas enable row level security;

drop policy if exists "publico le vagas ativas" on public.vagas;
drop policy if exists "equipe vagas"            on public.vagas;
drop policy if exists "publico se candidata"    on public.candidaturas;
drop policy if exists "equipe candidaturas"     on public.candidaturas;

-- candidato (sem login) lê só as vagas ativas
create policy "publico le vagas ativas" on public.vagas for select to anon, authenticated
  using (active);
-- equipe faz tudo nas vagas
create policy "equipe vagas" on public.vagas for all to authenticated
  using (coalesce(auth.jwt()->>'email','') not like '%@ponto.coquin.app')
  with check (coalesce(auth.jwt()->>'email','') not like '%@ponto.coquin.app');

-- candidato só INSERE, já como "novo", sem nota/anotação, com consentimento e numa vaga ativa
create policy "publico se candidata" on public.candidaturas for insert to anon, authenticated
  with check (
    consent
    and char_length(email) between 5 and 160
    and cv_text is null and cv_photo is null
    and status = 'novo' and coalesce(stars,0) = 0 and coalesce(notes,'') = ''
    and exists (select 1 from public.vagas v where v.id = vaga_id and v.active)
  );
-- equipe lê, avalia e apaga
create policy "equipe candidaturas" on public.candidaturas for all to authenticated
  using (coalesce(auth.jwt()->>'email','') not like '%@ponto.coquin.app')
  with check (coalesce(auth.jwt()->>'email','') not like '%@ponto.coquin.app');

-- ============ Storage: bucket privado "cvs" (até 5 MB, PDF / imagem / Word) ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs', 'cvs', false, 5242880, array[
  'application/pdf','image/jpeg','image/png','image/webp','image/heic',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "publico envia cv" on storage.objects;
drop policy if exists "equipe le cv"     on storage.objects;
drop policy if exists "equipe apaga cv"  on storage.objects;
-- candidato pode só SUBIR arquivo (sem sobrescrever, sem listar, sem baixar)
create policy "publico envia cv" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'cvs'
    and (storage.foldername(name))[1] in (select v.id from public.vagas v where v.active));
create policy "equipe le cv" on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and coalesce(auth.jwt()->>'email','') not like '%@ponto.coquin.app');
create policy "equipe apaga cv" on storage.objects for delete to authenticated
  using (bucket_id = 'cvs' and coalesce(auth.jwt()->>'email','') not like '%@ponto.coquin.app');

-- ============ Storage: bucket PÚBLICO "banners" (as artes das vagas, até 10 MB) ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('banners', 'banners', true, 10485760, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "equipe envia banner" on storage.objects;
drop policy if exists "equipe apaga banner" on storage.objects;
create policy "equipe envia banner" on storage.objects for insert to authenticated
  with check (bucket_id = 'banners' and coalesce(auth.jwt()->>'email','') not like '%@ponto.coquin.app');
create policy "equipe apaga banner" on storage.objects for delete to authenticated
  using (bucket_id = 'banners' and coalesce(auth.jwt()->>'email','') not like '%@ponto.coquin.app');

-- ============ Configurações do painel (ex.: etapas extras do quadro, como "Em treinamento") ============
create table if not exists public.vagas_config (
  key        text primary key,
  value      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.vagas_config enable row level security;
drop policy if exists "equipe config" on public.vagas_config;
create policy "equipe config" on public.vagas_config for all to authenticated
  using (coalesce(auth.jwt()->>'email','') not like '%@ponto.coquin.app')
  with check (coalesce(auth.jwt()->>'email','') not like '%@ponto.coquin.app');

-- ============ Tempo real (candidatura nova aparece sozinha no painel) ============
do $$ begin alter publication supabase_realtime add table public.candidaturas; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.vagas;        exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.vagas_config; exception when duplicate_object then null; end $$;
