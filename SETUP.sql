-- Coquin — setup do Supabase (rode uma vez no SQL Editor -> New query -> Run).
-- Idempotente: pode rodar de novo sem quebrar.

-- ============ Fechamentos diários ============
create table if not exists public.closings (
  date       date primary key,
  gelatos    integer not null default 0,
  revenue    numeric not null default 0,
  pix        numeric not null default 0,
  debito     numeric not null default 0,
  credito    numeric not null default 0,
  taxa       numeric not null default 0,   -- taxa da Stone (bruto - líquido)
  stone_tx   integer not null default 0,
  hours      jsonb,                         -- fluxo por hora (0..23) do CSV
  note       text default '',
  updated_at timestamptz not null default now()
);
alter table public.closings add column if not exists taxa numeric default 0;
alter table public.closings add column if not exists hours jsonb;

-- ============ Estoque (por produto: coco / sorvete) ============
create table if not exists public.stock (
  date       date,
  product    text not null default 'coco',
  comprados  integer default 0,
  custo      numeric default 0,   -- custo por unidade pago no dia
  degustacao integer default 0,
  treinamento integer default 0,
  perda      integer default 0,
  contagem   integer,             -- contagem física (opcional)
  note       text default '',
  updated_at timestamptz not null default now()
);
alter table public.stock add column if not exists product text default 'coco';
alter table public.stock add column if not exists custo numeric default 0;
alter table public.stock add column if not exists treinamento integer default 0;
alter table public.stock add column if not exists contagem integer;
update public.stock set product='coco' where product is null;
-- chave = (dia + produto) para permitir 2 produtos no mesmo dia
alter table public.stock drop constraint if exists stock_pkey;
alter table public.stock add primary key (date, product);

-- ============ Ajustes (linha única) ============
create table if not exists public.app_settings (
  id    integer primary key default 1 check (id = 1),
  unit  text default 'Imprensa',
  price numeric default 35,
  custo_plan numeric default 1.5,
  goals jsonb default '{}'::jsonb
);
alter table public.app_settings add column if not exists custo_plan numeric default 1.5;

-- ============ Segurança (RLS) — só quem loga lê/escreve ============
alter table public.closings     enable row level security;
alter table public.stock        enable row level security;
alter table public.app_settings enable row level security;
drop policy if exists "equipe closings" on public.closings;
drop policy if exists "equipe stock"    on public.stock;
drop policy if exists "equipe settings" on public.app_settings;
create policy "equipe closings" on public.closings     for all to authenticated using (true) with check (true);
create policy "equipe stock"    on public.stock        for all to authenticated using (true) with check (true);
create policy "equipe settings" on public.app_settings for all to authenticated using (true) with check (true);

-- ============ Tempo real (sincronia entre celulares) ============
do $$ begin alter publication supabase_realtime add table public.closings;     exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.stock;         exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.app_settings;  exception when duplicate_object then null; end $$;
